import type { Room } from "@colyseus/sdk";
import type { Space } from "@oncyberio/engine";
import type { VideoScreenComponent } from "@oncyberio/engine/space/components/video-screen/video-screen-component";
import { Vector3 } from "three";
import {
  SCREEN_CONTROL_MESSAGE,
  SCREEN_DURATION_MESSAGE,
  SCREEN_REFUSED_MESSAGE,
  SCREEN_STATE_MESSAGE,
  type ScreenDurationMessage,
  type ScreenRefusedMessage,
  type ScreenStateMessage,
} from "../../shared/messages";
import { screenPosition, type ScreenAction, type ScreenState } from "../../shared/screens";
import { setNearScreen, showModMessage, type NearScreen } from "./info-store";

const _screenPos = new Vector3();

function titleOf(item: { title?: string; url: string }, index: number): string {
  if (item.title) return item.title;
  const file = item.url.split(/[?#]/)[0].split("/").pop();
  return file ? decodeURIComponent(file) : `Video ${index + 1}`;
}

/**
 * Keeps the world's video screens on the playback the server shares, and
 * tells the UI which screen the player is standing at. Screens stream in and
 * out with chunks, so each one is picked up when it appears.
 */
export class ScreenSync {
  /** By screen id, with `at` on this client's clock. */
  private states = new Map<string, ScreenState>();
  private applied = new WeakMap<VideoScreenComponent, ScreenState>();
  private hooked = new WeakSet<VideoScreenComponent>();
  private unsubscribers: (() => void)[] = [];
  private nearItems = new Map<string, NearScreen["items"]>();

  constructor(
    private readonly room: Room<any>,
    private readonly space: Space,
    /** May the local player control this screen? Mirrors the server's check. */
    private readonly mayControl: (controlGate: string | null) => boolean,
  ) {
    this.listen(
      room.onMessage(SCREEN_STATE_MESSAGE, (msg: ScreenStateMessage) => {
        const offset = Date.now() - msg.serverNow;
        for (const [id, state] of Object.entries(msg.screens ?? {})) {
          this.states.set(id, { ...state, at: state.at + offset });
        }
        this.apply();
      }),
    );
    this.listen(
      room.onMessage(SCREEN_REFUSED_MESSAGE, (msg: ScreenRefusedMessage) => showModMessage(msg.error)),
    );
  }

  private listen(off: unknown) {
    if (typeof off === "function") this.unsubscribers.push(off as () => void);
  }

  private screens(): VideoScreenComponent[] {
    return (this.space.components?.byType("video-screen") ?? []) as VideoScreenComponent[];
  }

  /** Push shared playback to every loaded screen it hasn't reached yet. */
  apply(): void {
    for (const screen of this.screens()) {
      const id = screen.data.id;
      if (!id) continue;

      if (!this.hooked.has(screen)) {
        this.hooked.add(screen);
        // Whoever loads a video first tells the server how long it is, so it can move on at the end.
        screen.onDuration(({ index, ad, duration }) => {
          this.room.send(SCREEN_DURATION_MESSAGE, { screenId: id, index, ad, duration } satisfies ScreenDurationMessage);
        });
      }

      const state = this.states.get(id);
      if (!state || this.applied.get(screen) === state) continue;
      this.applied.set(screen, state);
      screen.applyPlayback({
        index: state.index,
        ad: state.ad,
        playing: state.playing,
        position: state.position,
        at: state.at,
        volume: state.volume,
        muted: state.muted,
        loop: state.loop,
      });
    }
  }

  /** Called a few times a second with the local player's position. */
  update(player: Vector3 | null): void {
    this.apply();
    if (!player) return setNearScreen(null);

    let nearest: VideoScreenComponent | null = null;
    let best = Infinity;
    for (const screen of this.screens()) {
      screen.getWorldPosition(_screenPos);
      const dist = _screenPos.distanceTo(player);
      if (dist <= (screen.data.controlDistance ?? 8) && dist < best) {
        best = dist;
        nearest = screen;
      }
    }

    if (!nearest?.data.id) return setNearScreen(null);
    const id = nearest.data.id;
    setNearScreen({
      id,
      label: nearest.data.label || nearest.data.name || "Screen",
      items: this.itemsOf(id, nearest.playlist),
      ads: this.itemsOf(`${id}#ads`, nearest.ads),
      state: this.states.get(id) ?? null,
      canControl: this.mayControl(nearest.data.controlGate || null),
      loadError: nearest.loadError,
    });
  }

  /** Stable list per playlist, so the UI doesn't re-render for nothing. */
  private itemsOf(id: string, list: { title?: string; url: string }[]): NearScreen["items"] {
    const items = list.map((item, i) => ({ title: titleOf(item, i), url: item.url }));
    const prev = this.nearItems.get(id);
    if (prev && prev.length === items.length && prev.every((p, i) => p.title === items[i].title && p.url === items[i].url)) {
      return prev;
    }
    this.nearItems.set(id, items);
    return items;
  }

  /** Ask the server to change a screen. It checks Control Screens. */
  control(screenId: string, action: ScreenAction): void {
    this.room.send(SCREEN_CONTROL_MESSAGE, { screenId, ...action });
  }

  /** Current position and length of a screen's video, for the controls' progress bar. */
  timeOf(screenId: string): { time: number; duration: number } {
    const state = this.states.get(screenId);
    const screen = this.screens().find((s) => s.data.id === screenId);
    const duration = screen?.duration || state?.duration || 0;
    const time = state ? screenPosition({ ...state, duration }, Date.now()) : 0;
    return { time, duration };
  }

  dispose(): void {
    this.unsubscribers.forEach((off) => off());
    this.unsubscribers = [];
    setNearScreen(null);
  }
}
