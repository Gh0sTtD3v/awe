import type { Component3D } from "../space/abstract/component-3d";
import type { AvatarComponent } from "../space/components/avatar/avatar-component";

const DEFAULT_BLEND_TIME = 0.1;

/**
 * Loop type for animations.
 */
export type LoopType = "once" | "repeat" | "pingpong";

/**
 * A state's clip can be a fixed clip name or a function that selects a clip
 * from the current machine context.
 *
 * Use a function when the gameplay phase is stable but the presentation varies,
 * for example a single `landing` state that picks between walk/run/roll clips.
 */
export type StateClip<TContext = {}> =
  | string
  | ((ctx: TContext & AnimationContext) => string);

/**
 * Configuration for a single animation state.
 *
 * States are best used for stable animation phases such as `idle`, `jump`,
 * `falling`, or `landing`. Prefer keeping variant selection inside the state's
 * clip resolver instead of flattening every visual variation into a separate
 * state.
 */
export interface StateConfig<TContext = {}> {
  /** Animation clip name to play, or a resolver that picks a clip from context */
  clip: StateClip<TContext>;
  /** Loop mode: "once", "repeat", or "pingpong" (default: "repeat") */
  loop?: LoopType;
  /** Playback speed multiplier (default: 1) */
  speed?: number;
  /** Blend/fade time when entering this state (default: 0.1) */
  blendTime?: number;
  /** Called when entering this state */
  onEnter?: (ctx: TContext & AnimationContext) => void;
  /** Called every frame while in this state */
  onUpdate?: (ctx: TContext & AnimationContext, dt: number) => void;
  /** Called when exiting this state */
  onExit?: (ctx: TContext & AnimationContext) => void;
}

/**
 * Configuration for a state transition.
 *
 * The machine is intentionally small and deterministic:
 * - queued events are processed first
 * - for each event, the first matching transition wins
 * - after events, condition transitions are scanned once
 * - the first matching condition transition wins
 *
 * `priority` is only a local tie-breaker when several transitions can match the
 * same state at the same time. If transitions are already mutually exclusive,
 * omit it and rely on declaration order.
 */
export interface TransitionConfig<TContext = {}> {
  /** Source state(s): state name, array of state names, or "*" for any state */
  from: string | string[] | "*";
  /** Target state to transition to */
  to: string;
  /** Condition function evaluated every frame (for condition-based transitions) */
  when?: (ctx: TContext & AnimationContext) => boolean;
  /** Event name that triggers this transition (for event-based transitions) */
  on?: string;
  /** Local ordering hint (higher = evaluated first, default: 0) */
  priority?: number;
  /** Blend time override for this specific transition */
  blendTime?: number;
  /** Guard function for event transitions (must return true to allow transition) */
  guard?: (ctx: TContext & AnimationContext) => boolean;
}

/**
 * Context available in state callbacks and transition conditions
 */
export interface AnimationContext {
  /** Current state name */
  currentState: string;
  /** Previous state name (null if no previous state) */
  previousState: string | null;
  /** Time spent in current state (seconds) */
  stateTime: number;
  /** True when a non-looping animation has completed */
  finished: boolean;
  /** The body/component being animated */
  body: Component3D;
}

/**
 * Information about an available transition
 */
export interface TransitionInfo {
  /** Target state */
  to: string;
  /** Type of transition */
  type: "condition" | "event";
  /** Event name (for event transitions) */
  event?: string;
  /** Priority */
  priority: number;
}

/**
 * Configuration for AnimationStateMachine
 */
export interface AnimationStateMachineConfig<TContext = {}> {
  /** The body/avatar to animate */
  body: Component3D;
  /** Initial state name */
  initial: string;
  /** State definitions (name -> config or just clip name) */
  states: Record<string, StateConfig<TContext> | string>;
  /** Transition definitions */
  transitions: TransitionConfig<TContext>[];
  /** Custom context object accessible in callbacks and conditions */
  context?: TContext;
  /** Default blend time for all transitions (default: 0.1) */
  defaultBlendTime?: number;
}

/**
 * Internal normalized transition with computed priority
 */
interface NormalizedTransition<TContext> {
  from: string | string[] | "*";
  to: string;
  when?: (ctx: TContext & AnimationContext) => boolean;
  on?: string;
  priority: number;
  index: number;
  blendTime?: number;
  guard?: (ctx: TContext & AnimationContext) => boolean;
}

/**
 * AnimationStateMachine is a small ordered transition machine for animation
 * presentation.
 *
 * The model is intentionally simpler than a full gameplay FSM:
 * - there is exactly one active state at a time
 * - states are animation phases, not concurrent systems
 * - events are queued and processed before condition checks
 * - for any event, at most one matching transition runs
 * - after events, condition transitions are scanned once and the first match wins
 * - transition ordering is `priority` descending, then declaration order
 *
 * In practice this works best when:
 * - states model stable phases such as `idle`, `jump`, `falling`, `landing`
 * - transitions describe phase changes
 * - clip resolvers handle purely visual variants inside a phase
 *
 * This class is not hierarchical and it does not try to resolve competing
 * intents automatically. If two transitions overlap, authors should make that
 * precedence explicit with either declaration order or a small `priority`
 * difference.
 *
 * @example
 * ```ts
 * const anim = new AnimationStateMachine<{ mover: Mover }>({
 *   body: avatar,
 *   initial: "idle",
 *   context: { mover },
 *
 *   states: {
 *     idle: { clip: "idle" },
 *     run: { clip: "run" },
 *     jump: {
 *       clip: (ctx) => (ctx.mover.speed > 8 ? "jump_run" : "jump_idle"),
 *       loop: "once",
 *     },
 *     fall: { clip: "falling" },
 *     slide: { clip: "slide", loop: "once" },
 *   },
 *
 *   transitions: [
 *     { from: "idle", to: "run", when: (ctx) => ctx.mover.speed > 0.5 },
 *     { from: "run", to: "idle", when: (ctx) => ctx.mover.speed < 0.5 },
 *     { from: ["idle", "run"], to: "jump", on: "jump" },
 *     { from: "jump", to: "fall", when: (ctx) => ctx.finished && !ctx.mover.grounded },
 *     { from: "*", to: "slide", on: "slide", guard: (ctx) => ctx.mover.grounded },
 *     { from: "slide", to: "idle", when: (ctx) => ctx.finished },
 *   ],
 * });
 *
 * // Event-driven trigger
 * slideInput.onPerformed(() => anim.send("slide"));
 *
 * // Update loop
 * anim.update(dt);
 * ```
 */
export class AnimationStateMachine<TContext = {}> {
  private _body: Component3D;
  private _states: Map<string, StateConfig<TContext>>;
  private _conditionTransitions: NormalizedTransition<TContext>[];
  private _eventTransitions: Map<string, NormalizedTransition<TContext>[]>;
  private _context: TContext;
  private _currentState: string;
  private _previousState: string | null = null;
  private _stateTime = 0;
  private _finished = false;
  private _pendingEvents: string[] = [];
  private _enabled = true;
  private _disposed = false;
  private _defaultBlendTime: number;

  constructor(config: AnimationStateMachineConfig<TContext>) {
    this._body = config.body;
    this._context = config.context ?? ({} as TContext);
    this._defaultBlendTime = config.defaultBlendTime ?? DEFAULT_BLEND_TIME;
    this._currentState = config.initial;

    // Normalize states
    this._states = new Map();
    for (const [name, value] of Object.entries(config.states)) {
      if (typeof value === "string") {
        this._states.set(name, { clip: value });
      } else {
        this._states.set(name, value);
      }
    }

    // Validate initial state
    if (!this._states.has(config.initial)) {
      throw new Error(
        `AnimationStateMachine: initial state "${config.initial}" not found in states`
      );
    }

    // Separate and sort transitions
    this._conditionTransitions = [];
    this._eventTransitions = new Map();

    for (const [index, t] of config.transitions.entries()) {
      const normalized: NormalizedTransition<TContext> = {
        from: t.from,
        to: t.to,
        when: t.when,
        on: t.on,
        priority: t.priority ?? 0,
        index,
        blendTime: t.blendTime,
        guard: t.guard,
      };

      if (t.on) {
        // Event-based transition
        if (!this._eventTransitions.has(t.on)) {
          this._eventTransitions.set(t.on, []);
        }
        this._eventTransitions.get(t.on)!.push(normalized);
      } else if (t.when) {
        // Condition-based transition
        this._conditionTransitions.push(normalized);
      }
    }

    // Sort condition transitions by priority (descending)
    this._conditionTransitions.sort(
      (a, b) => b.priority - a.priority || a.index - b.index
    );

    // Sort event transitions by priority (descending), then declaration order.
    for (const transitions of this._eventTransitions.values()) {
      transitions.sort(
        (a, b) => b.priority - a.priority || a.index - b.index
      );
    }

    // Play initial animation
    this._enterState(this._currentState, null);
  }

  /** Current state name */
  get currentState(): string {
    return this._currentState;
  }

  /** Previous state name (null if no previous state) */
  get previousState(): string | null {
    return this._previousState;
  }

  /** Time spent in current state (seconds) */
  get stateTime(): number {
    return this._stateTime;
  }

  /** True when a non-looping animation has completed */
  get finished(): boolean {
    return this._finished;
  }

  /** Whether the state machine is enabled */
  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  /** Whether the state machine has been disposed */
  get disposed(): boolean {
    return this._disposed;
  }

  /**
   * Queue an event to be processed on the next update.
   *
   * Events are handled before condition transitions. For a given event name, the
   * first matching transition wins.
   */
  send(event: string): void {
    if (this._disposed || !this._enabled) return;
    this._pendingEvents.push(event);
  }

  /**
   * Check if currently in a specific state
   */
  is(state: string): boolean {
    return this._currentState === state;
  }

  /**
   * Check if currently in any of the specified states
   */
  isAnyOf(...states: string[]): boolean {
    return states.includes(this._currentState);
  }

  /**
   * Check if a transition to the target state is possible
   * (checks if any transition exists, not if conditions are met)
   */
  canTransitionTo(state: string): boolean {
    // Check condition transitions
    for (const t of this._conditionTransitions) {
      if (t.to === state && this._matchesFrom(t.from)) {
        return true;
      }
    }

    // Check event transitions
    for (const transitions of this._eventTransitions.values()) {
      for (const t of transitions) {
        if (t.to === state && this._matchesFrom(t.from)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get information about all available transitions from the current state
   */
  getAvailableTransitions(): TransitionInfo[] {
    const result: TransitionInfo[] = [];

    // Condition transitions
    for (const t of this._conditionTransitions) {
      if (this._matchesFrom(t.from)) {
        result.push({
          to: t.to,
          type: "condition",
          priority: t.priority,
        });
      }
    }

    // Event transitions
    for (const [event, transitions] of this._eventTransitions) {
      for (const t of transitions) {
        if (this._matchesFrom(t.from)) {
          result.push({
            to: t.to,
            type: "event",
            event,
            priority: t.priority,
          });
        }
      }
    }

    return result;
  }

  /**
   * Force transition to a state, bypassing normal transition rules.
   * Use sparingly - prefer proper transitions when possible.
   */
  forceState(state: string): void {
    if (this._disposed) return;

    const stateConfig = this._states.get(state);
    if (!stateConfig) {
      console.warn(
        `AnimationStateMachine: cannot force to unknown state "${state}"`
      );
      return;
    }

    if (state === this._currentState) return;

    this._transitionTo(state, stateConfig.blendTime);
  }

  /**
   * Update the context with partial values
   */
  setContext(partial: Partial<TContext>): void {
    this._context = { ...this._context, ...partial };
  }

  /**
   * Update the state machine once per frame.
   *
   * Update order:
   * 1. consume queued events
   * 2. run at most one condition transition
   * 3. advance state time
   * 4. call the active state's update callback
   */
  update(dt: number): void {
    if (this._disposed || !this._enabled) return;

    // 1. Process pending events
    this._processEvents();

    // 2. Evaluate condition transitions
    this._evaluateConditionTransitions();

    // 3. Increment state time
    this._stateTime += dt;

    // 4. Call current state's onUpdate
    const stateConfig = this._states.get(this._currentState);
    if (stateConfig?.onUpdate) {
      stateConfig.onUpdate(this._createContext(), dt);
    }
  }

  /**
   * Dispose the state machine and clean up resources
   */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._pendingEvents = [];
  }

  // Private methods

  private _isAvatar(body: Component3D): body is AvatarComponent {
    return body.data.type === "avatar";
  }

  private _createContext(): TContext & AnimationContext {
    return {
      ...this._context,
      currentState: this._currentState,
      previousState: this._previousState,
      stateTime: this._stateTime,
      finished: this._finished,
      body: this._body,
    };
  }

  private _matchesFrom(from: string | string[] | "*"): boolean {
    if (from === "*") return true;
    if (Array.isArray(from)) return from.includes(this._currentState);
    return from === this._currentState;
  }

  private _processEvents(): void {
    if (this._pendingEvents.length === 0) return;

    // Process each event
    for (const event of this._pendingEvents) {
      const transitions = this._eventTransitions.get(event);
      if (!transitions) continue;

      // Find the first matching transition in evaluation order.
      for (const t of transitions) {
        if (!this._matchesFrom(t.from)) continue;

        // Check guard condition
        if (t.guard) {
          const ctx = this._createContext();
          if (!t.guard(ctx)) continue;
        }

        // Execute transition
        this._transitionTo(t.to, t.blendTime);
        break; // Only one transition per event
      }
    }

    // Clear processed events
    this._pendingEvents = [];
  }

  private _evaluateConditionTransitions(): void {
    const ctx = this._createContext();

    // Evaluate transitions in machine order and stop at the first match.
    for (const t of this._conditionTransitions) {
      if (!this._matchesFrom(t.from)) continue;

      // Check condition
      if (t.when && t.when(ctx)) {
        // Don't transition to the same state
        if (t.to === this._currentState) continue;

        this._transitionTo(t.to, t.blendTime);
        return; // Only one transition per frame
      }
    }
  }

  private _transitionTo(newState: string, blendTimeOverride?: number): void {
    const oldState = this._currentState;
    const oldConfig = this._states.get(oldState);

    // Call onExit for old state
    if (oldConfig?.onExit) {
      oldConfig.onExit(this._createContext());
    }

    // Update state
    this._previousState = oldState;
    this._currentState = newState;
    this._stateTime = 0;
    this._finished = false;

    // Enter new state
    this._enterState(newState, blendTimeOverride);
  }

  private _enterState(
    state: string,
    blendTimeOverride: number | null | undefined
  ): void {
    const stateConfig = this._states.get(state);
    if (!stateConfig) {
      console.warn(`AnimationStateMachine: unknown state "${state}"`);
      return;
    }

    const ctx = this._createContext();

    // Play animation
    this._playAnimation(stateConfig, ctx, blendTimeOverride);

    // Call onEnter
    if (stateConfig.onEnter) {
      stateConfig.onEnter(ctx);
    }
  }

  private _playAnimation(
    config: StateConfig<TContext>,
    ctx: TContext & AnimationContext,
    blendTimeOverride?: number | null
  ): void {
    if (!this._isAvatar(this._body)) return;

    const loop = config.loop ?? "repeat";
    const blendTime = blendTimeOverride ?? config.blendTime ?? this._defaultBlendTime;
    const clip = typeof config.clip === "function" ? config.clip(ctx) : config.clip;

    this._body.play(clip, {
      fadeIn: blendTime,
      stopAll: true,
      loop,
      speed: config.speed ?? 1,
      clampWhenFinished: loop === "once",
      callback: (opts: { type: string }) => {
        if (opts.type === "finished") {
          this._finished = true;
        }
      },
    });
  }
}
