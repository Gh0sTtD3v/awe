/**
 * Video screens, shared by everyone: the server owns one playback per screen
 * and every client follows it. Pure functions so the server and tests share
 * them. Times are milliseconds on the server's clock.
 */

export type ScreenLoop = "off" | "one" | "all";

/** What the server knows about a screen, read from the scene files. */
export interface ScreenDef {
  id: string;
  /** Playlist entries with a URL. */
  count: number;
  autoPlay: boolean;
  loop: ScreenLoop;
  volume: number;
}

export interface ScreenState {
  /** Playlist index, -1 when nothing is loaded. */
  index: number;
  playing: boolean;
  /** Seconds into the video at `at`. */
  position: number;
  /** Server time (ms) when `position` was true. */
  at: number;
  volume: number;
  muted: boolean;
  loop: ScreenLoop;
  /** Length of the current video in seconds, 0 until a client reports it. */
  duration: number;
}

export type ScreenAction =
  | { action: "select"; index: number }
  | { action: "play" }
  | { action: "pause" }
  | { action: "stop" }
  | { action: "next" }
  | { action: "previous" }
  | { action: "seek"; time: number }
  | { action: "volume"; volume: number }
  | { action: "mute"; muted: boolean }
  | { action: "loop"; loop: ScreenLoop };

const LOOPS: readonly ScreenLoop[] = ["off", "one", "all"];
/** Longer than any sane video; rejects absurd reports. */
export const MAX_DURATION = 24 * 60 * 60;

export function isScreenLoop(value: unknown): value is ScreenLoop {
  return typeof value === "string" && (LOOPS as readonly string[]).includes(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** A `video-screen` component from a scene file, or null. */
export function screenFromComponent(component: unknown): ScreenDef | null {
  const c = component as any;
  if (!c || c.type !== "video-screen" || typeof c.id !== "string" || !c.id) return null;

  const playlist = Array.isArray(c.playlist) ? c.playlist : [];
  return {
    id: c.id,
    count: playlist.filter((item: any) => item && typeof item.url === "string" && item.url).length,
    autoPlay: c.autoPlay === true,
    loop: isScreenLoop(c.loop) ? c.loop : "all",
    volume: Number.isFinite(c.volume) ? clamp(c.volume, 0, 1) : 0.75,
  };
}

export function initialScreenState(def: ScreenDef, now: number): ScreenState {
  const start = def.autoPlay && def.count > 0;
  return {
    index: start ? 0 : -1,
    playing: start,
    position: 0,
    at: now,
    volume: def.volume,
    muted: false,
    loop: def.loop,
    duration: 0,
  };
}

/** Seconds into the current video at `now`. */
export function screenPosition(state: ScreenState, now: number): number {
  let time = state.playing ? state.position + Math.max(0, now - state.at) / 1000 : state.position;
  if (state.duration > 0) {
    time = state.loop === "one" ? time % state.duration : Math.min(time, state.duration);
  }
  return Math.max(0, time);
}

/** Restart the clock at the current position, so other fields can change. */
function settle(state: ScreenState, now: number): ScreenState {
  return { ...state, position: screenPosition(state, now), at: now };
}

function load(state: ScreenState, index: number, now: number): ScreenState {
  return { ...state, index, playing: true, position: 0, at: now, duration: 0 };
}

function step(def: ScreenDef, from: number, by: number): number {
  return (((from + by) % def.count) + def.count) % def.count;
}

/**
 * Apply a control action. Returns the new state, or an error for an action
 * that makes no sense right now (nothing loaded, no such video).
 */
export function controlScreen(
  state: ScreenState,
  def: ScreenDef,
  control: ScreenAction,
  now: number,
): ScreenState | { error: string } {
  const loaded = state.index >= 0 && state.index < def.count;

  switch (control.action) {
    case "select":
      if (!Number.isInteger(control.index) || control.index < 0 || control.index >= def.count) {
        return { error: "That video isn't on this screen's playlist." };
      }
      return load(state, control.index, now);

    case "next":
    case "previous":
      if (def.count === 0) return { error: "This screen has no videos." };
      return load(state, loaded ? step(def, state.index, control.action === "next" ? 1 : -1) : 0, now);

    case "play":
      if (!loaded) return def.count > 0 ? load(state, 0, now) : { error: "This screen has no videos." };
      if (state.playing) return state;
      // Playing again from the very end starts over.
      return {
        ...state,
        playing: true,
        position: state.duration > 0 && state.position >= state.duration ? 0 : state.position,
        at: now,
      };

    case "pause":
      if (!loaded || !state.playing) return state;
      return { ...settle(state, now), playing: false };

    case "stop":
      return { ...state, index: -1, playing: false, position: 0, at: now, duration: 0 };

    case "seek": {
      if (!loaded) return { error: "Nothing is playing." };
      if (!Number.isFinite(control.time)) return { error: "Invalid time." };
      const max = state.duration > 0 ? state.duration : MAX_DURATION;
      return { ...state, position: clamp(control.time, 0, max), at: now };
    }

    case "volume":
      if (!Number.isFinite(control.volume)) return { error: "Invalid volume." };
      return { ...state, volume: clamp(control.volume, 0, 1) };

    case "mute":
      return { ...state, muted: control.muted === true };

    case "loop":
      if (!isScreenLoop(control.loop)) return { error: "Invalid loop mode." };
      return { ...settle(state, now), loop: control.loop };
  }
}

/**
 * A client reported the length of the video it loaded. The first plausible
 * report for the current video wins; later ones are ignored.
 */
export function withDuration(state: ScreenState, index: number, duration: number): ScreenState | null {
  if (index !== state.index || state.index < 0 || state.duration > 0) return null;
  if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_DURATION) return null;
  return { ...state, duration };
}

/** Milliseconds until the current video ends, or null if it won't (paused, looping one, unknown length). */
export function msUntilEnd(state: ScreenState, now: number): number | null {
  if (!state.playing || state.index < 0 || state.duration <= 0 || state.loop === "one") return null;
  return Math.max(0, (state.duration - screenPosition(state, now)) * 1000);
}

/** The current video reached its end: next video, or stop, by the loop mode. */
export function advanceScreen(state: ScreenState, def: ScreenDef, now: number): ScreenState {
  if (state.loop === "all" && def.count > 0) return load(state, step(def, state.index, 1), now);
  return { ...state, playing: false, position: state.duration, at: now };
}

/** The playlist was edited: keep playing if the video still exists, otherwise start over or stop. */
export function reconcileScreen(state: ScreenState, def: ScreenDef, now: number): ScreenState {
  if (state.index < def.count) return state;
  return def.count > 0 && state.playing ? load(state, 0, now) : { ...state, index: -1, playing: false, position: 0, at: now, duration: 0 };
}

/** Validate a client's `screen:control` payload. */
export function parseScreenControl(value: unknown): ({ screenId: string } & ScreenAction) | null {
  if (value == null || typeof value !== "object") return null;
  const v = value as any;
  if (typeof v.screenId !== "string" || !v.screenId) return null;

  switch (v.action) {
    case "select":
      return Number.isInteger(v.index) ? { screenId: v.screenId, action: "select", index: v.index } : null;
    case "seek":
      return Number.isFinite(v.time) ? { screenId: v.screenId, action: "seek", time: v.time } : null;
    case "volume":
      return Number.isFinite(v.volume) ? { screenId: v.screenId, action: "volume", volume: v.volume } : null;
    case "mute":
      return typeof v.muted === "boolean" ? { screenId: v.screenId, action: "mute", muted: v.muted } : null;
    case "loop":
      return isScreenLoop(v.loop) ? { screenId: v.screenId, action: "loop", loop: v.loop } : null;
    case "play":
    case "pause":
    case "stop":
    case "next":
    case "previous":
      return { screenId: v.screenId, action: v.action };
    default:
      return null;
  }
}
