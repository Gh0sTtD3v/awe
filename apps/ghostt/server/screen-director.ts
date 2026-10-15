import {
  advanceScreen,
  controlScreen,
  initialScreenState,
  msUntilEnd,
  reconcileScreen,
  withDuration,
  type ScreenAction,
  type ScreenDef,
  type ScreenState,
} from "../shared/screens";

/**
 * The playback of every video screen in one room. Clients only follow it;
 * changes come from players with Control Screens, and the director itself
 * moves on to the next video when one ends.
 */
export class ScreenDirector {
  private defs = new Map<string, ScreenDef>();
  private states = new Map<string, ScreenState>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    /** Called with the screens whose playback changed. */
    private readonly publish: (changed: Record<string, ScreenState>) => void,
    private readonly now: () => number = Date.now,
  ) {}

  all(): Record<string, ScreenState> {
    return Object.fromEntries(this.states);
  }

  get(id: string): ScreenState | null {
    return this.states.get(id) ?? null;
  }

  /** The scene changed: add new screens, drop deleted ones, fix edited playlists. */
  setDefs(defs: ScreenDef[]): void {
    const now = this.now();
    const changed: Record<string, ScreenState> = {};
    const ids = new Set(defs.map((d) => d.id));

    for (const id of [...this.states.keys()]) {
      if (ids.has(id)) continue;
      this.states.delete(id);
      this.clearTimer(id);
    }

    this.defs = new Map(defs.map((d) => [d.id, d]));
    for (const def of defs) {
      const prev = this.states.get(def.id);
      const next = prev ? reconcileScreen(prev, def, now) : initialScreenState(def, now);
      if (next !== prev) {
        changed[def.id] = next;
        this.store(def, next);
      }
    }

    if (Object.keys(changed).length) this.publish(changed);
  }

  control(id: string, action: ScreenAction): { ok: true } | { error: string } {
    const def = this.defs.get(id);
    const state = this.states.get(id);
    if (!def || !state) return { error: "That screen isn't in this world." };

    const next = controlScreen(state, def, action, this.now());
    if ("error" in next) return next;
    this.commit(def, next);
    return { ok: true };
  }

  reportDuration(id: string, index: number, duration: number): void {
    const def = this.defs.get(id);
    const state = this.states.get(id);
    if (!def || !state) return;

    const next = withDuration(state, index, duration);
    if (next) this.commit(def, next);
  }

  dispose(): void {
    for (const id of [...this.timers.keys()]) this.clearTimer(id);
  }

  private commit(def: ScreenDef, state: ScreenState) {
    this.store(def, state);
    this.publish({ [def.id]: state });
  }

  /** Keep the state and (re)arm the end-of-video timer. */
  private store(def: ScreenDef, state: ScreenState) {
    this.states.set(def.id, state);
    this.clearTimer(def.id);

    const wait = msUntilEnd(state, this.now());
    if (wait == null) return;
    this.timers.set(
      def.id,
      setTimeout(() => {
        this.timers.delete(def.id);
        const current = this.states.get(def.id);
        const currentDef = this.defs.get(def.id) ?? def;
        if (current !== state) return;
        this.commit(currentDef, advanceScreen(current, currentDef, this.now()));
      }, wait),
    );
  }

  private clearTimer(id: string) {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
  }
}
