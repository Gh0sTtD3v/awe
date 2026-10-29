/**
 * Video screens, shared by everyone: the server owns one playback per screen
 * and every client follows it. Pure functions so the server and tests share
 * them. Times are milliseconds on the server's clock.
 *
 * Each screen has its own playlist and, optionally, its own ads: when a
 * screen has ads, one plays (in rotation) before every video it starts.
 * Ads can be paused but not skipped or seeked.
 */

export type ScreenLoop = "off" | "one" | "all";

/** What the server knows about a screen, read from the scene files. */
export interface ScreenDef {
  id: string;
  /** Playlist entries with a URL. */
  count: number;
  /** Ad entries with a URL. */
  adCount: number;
  autoPlay: boolean;
  loop: ScreenLoop;
  volume: number;
  /**
   * Token gate whose holders may control this screen (e.g. the apartment's
   * gate), or {@link SCREEN_CONTROL_EVERYONE}, besides anyone with Control
   * Screens. Null: the permission only.
   */
  controlGate: string | null;
}

/** `controlGate` value that lets every player control the screen. */
export const SCREEN_CONTROL_EVERYONE = "everyone";

/**
 * May a player control a screen? The same rule on the server, which enforces
 * it, and the client, which only uses it to show or hide the controls.
 */
export function mayControlScreen(
  controlGate: string | null,
  canControlScreens: boolean,
  gateAccess: Record<string, boolean>,
): boolean {
  if (canControlScreens || controlGate === SCREEN_CONTROL_EVERYONE) return true;
  return !!controlGate && gateAccess[controlGate] === true;
}

export interface ScreenState {
  /** Playlist index, -1 when nothing is loaded. While an ad plays, the video that follows it. */
  index: number;
  /** Ad index playing before the video, or -1. */
  ad: number;
  /** Which ad plays next, so they take turns. */
  adCursor: number;
  playing: boolean;
  /** Seconds into the current video (or ad) at `at`. */
  position: number;
  /** Server time (ms) when `position` was true. */
  at: number;
  volume: number;
  muted: boolean;
  loop: ScreenLoop;
  /** Length of the current video (or ad) in seconds, 0 until a client reports it. */
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

function urlCount(list: unknown): number {
  return Array.isArray(list) ? list.filter((item: any) => item && typeof item.url === "string" && item.url).length : 0;
}

/** A `video-screen` component from a scene file, or null. */
export function screenFromComponent(component: unknown): ScreenDef | null {
  const c = component as any;
  if (!c || c.type !== "video-screen" || typeof c.id !== "string" || !c.id) return null;

  return {
    id: c.id,
    count: urlCount(c.playlist),
    adCount: urlCount(c.ads),
    autoPlay: c.autoPlay === true,
    loop: isScreenLoop(c.loop) ? c.loop : "all",
    volume: Number.isFinite(c.volume) ? clamp(c.volume, 0, 1) : 0.75,
    controlGate: typeof c.controlGate === "string" && c.controlGate ? c.controlGate : null,
  };
}

function idle(state: ScreenState, now: number): ScreenState {
  return { ...state, index: -1, ad: -1, playing: false, position: 0, at: now, duration: 0 };
}

/** Start video `index` from the top — after an ad, if the screen has any. */
function load(state: ScreenState, def: ScreenDef, index: number, now: number): ScreenState {
  const ad = def.adCount > 0 ? state.adCursor % def.adCount : -1;
  return {
    ...state,
    index,
    ad,
    adCursor: ad >= 0 ? (ad + 1) % def.adCount : state.adCursor,
    playing: true,
    position: 0,
    at: now,
    duration: 0,
  };
}

export function initialScreenState(def: ScreenDef, now: number): ScreenState {
  const base: ScreenState = {
    index: -1,
    ad: -1,
    adCursor: 0,
    playing: false,
    position: 0,
    at: now,
    volume: def.volume,
    muted: false,
    loop: def.loop,
    duration: 0,
  };
  return def.autoPlay && def.count > 0 ? load(base, def, 0, now) : base;
}

/** Seconds into the current video (or ad) at `now`. */
export function screenPosition(state: ScreenState, now: number): number {
  let time = state.playing ? state.position + Math.max(0, now - state.at) / 1000 : state.position;
  if (state.duration > 0) {
    // Ads never repeat; a video on "repeat one" wraps around.
    time = state.loop === "one" && state.ad < 0 ? time % state.duration : Math.min(time, state.duration);
  }
  return Math.max(0, time);
}

/** Restart the clock at the current position, so other fields can change. */
function settle(state: ScreenState, now: number): ScreenState {
  return { ...state, position: screenPosition(state, now), at: now };
}

function step(def: ScreenDef, from: number, by: number): number {
  return (((from + by) % def.count) + def.count) % def.count;
}

/** Pick the video to play. During an ad it's queued: the ad finishes first. */
function choose(state: ScreenState, def: ScreenDef, index: number, now: number): ScreenState {
  if (state.ad >= 0 && state.ad < def.adCount) return { ...state, index };
  return load(state, def, index, now);
}

/**
 * Apply a control action. Returns the new state, or an error for an action
 * that makes no sense right now (nothing loaded, no such video, skipping an ad).
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
      return choose(state, def, control.index, now);

    case "next":
    case "previous":
      if (def.count === 0) return { error: "This screen has no videos." };
      return choose(state, def, loaded ? step(def, state.index, control.action === "next" ? 1 : -1) : 0, now);

    case "play":
      if (!loaded) return def.count > 0 ? load(state, def, 0, now) : { error: "This screen has no videos." };
      if (state.playing) return state;
      // Playing again from the very end of a video starts it over (with an ad, if any).
      if (state.ad < 0 && state.duration > 0 && state.position >= state.duration) {
        return load(state, def, state.index, now);
      }
      return { ...state, playing: true, at: now };

    case "pause":
      if (!loaded || !state.playing) return state;
      return { ...settle(state, now), playing: false };

    case "stop":
      return idle(state, now);

    case "seek": {
      if (!loaded) return { error: "Nothing is playing." };
      if (state.ad >= 0) return { error: "Ads can't be skipped." };
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
 * A client reported the length of what it loaded (`ad` -1 for the video).
 * The first plausible report for the current item wins; later ones are ignored.
 */
export function withDuration(state: ScreenState, index: number, ad: number, duration: number): ScreenState | null {
  if (index !== state.index || ad !== state.ad || state.index < 0 || state.duration > 0) return null;
  if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_DURATION) return null;
  return { ...state, duration };
}

/** Milliseconds until the current video (or ad) ends, or null if it won't (paused, repeating, unknown length). */
export function msUntilEnd(state: ScreenState, now: number): number | null {
  if (!state.playing || state.index < 0 || state.duration <= 0) return null;
  if (state.loop === "one" && state.ad < 0) return null;
  return Math.max(0, (state.duration - screenPosition(state, now)) * 1000);
}

/** The current item reached its end: ad → its video; video → next, or stop, by the loop mode. */
export function advanceScreen(state: ScreenState, def: ScreenDef, now: number): ScreenState {
  if (state.ad >= 0) return { ...state, ad: -1, playing: true, position: 0, at: now, duration: 0 };
  if (state.loop === "all" && def.count > 0) return load(state, def, step(def, state.index, 1), now);
  return { ...state, playing: false, position: state.duration, at: now };
}

/** The playlist or ads were edited: keep going if what's playing still exists. */
export function reconcileScreen(state: ScreenState, def: ScreenDef, now: number): ScreenState {
  let next = state;
  if (next.ad >= def.adCount) next = { ...next, ad: -1, position: 0, at: now, duration: 0 };
  if (next.adCursor >= Math.max(1, def.adCount)) next = { ...next, adCursor: 0 };
  if (next.index >= def.count) next = def.count > 0 && next.playing ? load(next, def, 0, now) : idle(next, now);
  return next;
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
