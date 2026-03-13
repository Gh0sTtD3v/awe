import type { Component3D } from "../space/abstract/component-3d";
import { AnimationStateMachine } from "./animation-state-machine";
import type {
  AnimationContext,
  StateClip,
} from "./animation-state-machine";
import type { Mover } from "./mover";

// --- State types ---

/** Ground-based locomotion states, driven by movement speed. */
export type MoverAnimLocomotionState = "idle" | "walk" | "run" | "sprint";

/** Airborne states (jump / double-jump / falling). */
export type MoverAnimAirState = "jump" | "jump_double" | "falling";

/** All possible animation states the mover can be in. */
export type MoverAnimState =
  | MoverAnimLocomotionState
  | MoverAnimAirState
  | "landing";

/** Bucketed speed classification used by getMoverAnimSpeedCategory. */
export type MoverAnimSpeedCategory =
  | "idle"
  | "walking"
  | "running"
  | "sprinting";

// --- Configuration interfaces ---

/**
 * Speed breakpoints that separate walk from run/sprint.
 * - Speeds below 0.5 are always "idle".
 * - Speeds between 0.5 and `walk` are "walking".
 * - Speeds between `walk` and `sprint` are "running".
 * - Speeds above `sprint` are "sprinting".
 */
export interface MoverAnimSpeedThresholds {
  walk: number;
  sprint: number;
}

/**
 * Runtime mover facts latched by the helper for presentation decisions.
 *
 * `jumpTakeoffState` is captured when the mover accepts a jump.
 * `landingVelocityY` is refreshed while airborne and preserved on touchdown so
 * landing clips can inspect the final fall speed.
 */
export interface MoverAnimRuntimeContext {
  mover: Mover;
  jumpTakeoffState: MoverAnimLocomotionState;
  landingVelocityY: number;
}

/** User-supplied context merged with mover references and latched facts. */
export type MoverAnimContext<TContext = {}> =
  TContext & MoverAnimRuntimeContext;

/** Full context available inside transition guards and clip resolvers. */
export type MoverAnimMachineContext<TContext = {}> =
  MoverAnimContext<TContext> & AnimationContext;

/** One animation clip per locomotion speed tier. */
export interface MoverAnimLocomotionClips<TContext = {}> {
  idle: StateClip<MoverAnimContext<TContext>>;
  walk: StateClip<MoverAnimContext<TContext>>;
  run: StateClip<MoverAnimContext<TContext>>;
  sprint: StateClip<MoverAnimContext<TContext>>;
}

/** Configuration for the primary jump state. */
export interface MoverAnimJumpConfig<TContext = {}> {
  clip: StateClip<MoverAnimContext<TContext>>;
  /** Event name that triggers the jump (default: "jump"). */
  event?: string;
  /** States from which the jump can be triggered (default: all grounded states). */
  from?: string[];
  /** Guard that decides when jump transitions to falling. */
  toFallWhen: (ctx: MoverAnimMachineContext<TContext>) => boolean;
}

/** Configuration for an optional double-jump state. */
export interface MoverAnimDoubleJumpConfig<TContext = {}> {
  clip: StateClip<MoverAnimContext<TContext>>;
  /** Event name (defaults to the same event as the primary jump). */
  event?: string;
  /** States from which double-jump can be triggered (default: ["jump", "falling"]). */
  from?: string[];
  /** Guard for transitioning to falling (defaults to the primary jump's guard). */
  toFallWhen?: (ctx: MoverAnimMachineContext<TContext>) => boolean;
}

/** Configuration for the falling state. */
export interface MoverAnimFallConfig<TContext = {}> {
  clip: StateClip<MoverAnimContext<TContext>>;
  /** Guard for transitioning from ground to falling (e.g. walking off a ledge).
   *  Default: `!mover.grounded && stateTime > 0`. */
  fromGroundWhen?: (ctx: MoverAnimMachineContext<TContext>) => boolean;
}

/** Configuration for an optional landing state (one-shot clip on touchdown). */
export interface MoverAnimLandingConfig<TContext = {}> {
  clip: StateClip<MoverAnimContext<TContext>>;
  /** Airborne states that can transition into landing (default: all airborne states). */
  from?: string[];
  /** Guard for entering the landing state (default: `mover.grounded`). */
  when?: (ctx: MoverAnimMachineContext<TContext>) => boolean;
  /** Guard for exiting landing back to locomotion (default: clip finished && grounded). */
  exitWhen?: (ctx: MoverAnimMachineContext<TContext>) => boolean;
}

/** Top-level config for createMoverAnimStateMachine. */
export interface MoverAnimStateMachineConfig<TContext = {}> {
  /** The 3D component whose animations are driven. */
  body: Component3D;
  /** The mover whose physics state (grounded, speed, etc.) drives transitions. */
  mover: Mover;
  /** Starting locomotion state (default: "idle"). */
  initial?: MoverAnimLocomotionState;
  /** Extra context merged into the animation context. */
  context?: TContext;
  /** Default cross-fade duration between states (seconds). */
  defaultBlendTime?: number;
  /** One clip per locomotion tier. */
  locomotionClips: MoverAnimLocomotionClips<TContext>;
  /**
   * Convenience thresholds for standard idle/walk/run/sprint locomotion.
   *
   * If provided, the helper derives locomotion states directly from mover
   * speed. Use `resolveLocomotionState` for custom policies instead.
   */
  locomotionThresholds?: MoverAnimSpeedThresholds;
  /** Called each frame to determine which locomotion state should be active. */
  resolveLocomotionState?: (
    ctx: MoverAnimMachineContext<TContext>
  ) => MoverAnimLocomotionState;
  jump: MoverAnimJumpConfig<TContext>;
  doubleJump?: MoverAnimDoubleJumpConfig<TContext>;
  fall: MoverAnimFallConfig<TContext>;
  landing?: MoverAnimLandingConfig<TContext>;
}

// --- Helpers ---

/**
 * Classify a speed value into a bucketed category using the given thresholds.
 * Used internally to map continuous speed to discrete locomotion states.
 */
export function getMoverAnimSpeedCategory(
  speed: number,
  thresholds: MoverAnimSpeedThresholds
): MoverAnimSpeedCategory {
  if (speed < 0.5) return "idle";
  if (speed < thresholds.walk) return "walking";
  if (speed < thresholds.sprint) return "running";
  return "sprinting";
}

/**
 * Map a speed value directly to a locomotion animation state name.
 * Convenience wrapper over getMoverAnimSpeedCategory.
 */
export function getMoverAnimLocomotionState(
  speed: number,
  thresholds: MoverAnimSpeedThresholds
): MoverAnimLocomotionState {
  const category = getMoverAnimSpeedCategory(speed, thresholds);

  switch (category) {
    case "walking":
      return "walk";
    case "running":
      return "run";
    case "sprinting":
      return "sprint";
    case "idle":
    default:
      return "idle";
  }
}

// --- State machine factory ---

/**
 * Build a mover-driven animation state machine with a shared phase model:
 * locomotion -> jump -> falling -> optional landing -> locomotion.
 *
 * This helper owns the bridge between mover physics and animation events:
 * - it listens to `mover.jumped` and queues the matching animation jump event
 * - it snapshots the resolved takeoff locomotion state for jump clip selection
 * - it keeps the latest airborne vertical velocity latched for landing clips
 *
 * Presets provide the policy:
 * - how to map mover state to locomotion clips
 * - when a jump phase should become a fall phase
 * - whether landing is a real one-shot phase or an immediate return to locomotion
 * - any presentation-specific clip selection inside those phases
 */
export function createMoverAnimStateMachine<TContext = {}>(
  config: MoverAnimStateMachineConfig<TContext>
): AnimationStateMachine<MoverAnimContext<TContext>> {
  let extraContext = { ...(config.context ?? ({} as TContext)) } as TContext;

  const resolveLocomotionState =
    config.resolveLocomotionState ??
    (config.locomotionThresholds
      ? ((ctx: MoverAnimMachineContext<TContext>) =>
          getMoverAnimLocomotionState(
            ctx.mover.speed,
            config.locomotionThresholds!
          ))
      : null);

  if (!resolveLocomotionState) {
    throw new Error(
      "createMoverAnimStateMachine: provide either locomotionThresholds or resolveLocomotionState"
    );
  }

  const runtimeContext: Omit<MoverAnimRuntimeContext, "mover"> = {
    jumpTakeoffState: config.initial ?? "idle",
    landingVelocityY: config.mover.velocity.y,
  };
  const context = {
    ...extraContext,
    ...runtimeContext,
    mover: config.mover,
  } as MoverAnimContext<TContext>;

  // ── Define animation states ──────────────────────────────────────────
  // Locomotion clips loop by default; jump and landing play once.
  const states = {
    idle: { clip: config.locomotionClips.idle },
    walk: { clip: config.locomotionClips.walk },
    run: { clip: config.locomotionClips.run },
    sprint: { clip: config.locomotionClips.sprint },
    jump: { clip: config.jump.clip, loop: "once" as const },
    falling: { clip: config.fall.clip },
    ...(config.doubleJump
      ? {
          jump_double: {
            clip: config.doubleJump.clip,
            loop: "once" as const,
          },
        }
      : {}),
    ...(config.landing
      ? {
          landing: {
            clip: config.landing.clip,
            loop: "once" as const,
          },
        }
      : {}),
  };

  // ── Classify states into grounded vs airborne groups ─────────────────
  // These groups are used as default `from` arrays in transitions.
  const groundedStates: string[] = ["idle", "walk", "run", "sprint"];
  if (config.landing) {
    groundedStates.push("landing");
  }

  const airborneStates: string[] = ["jump", "falling"];
  if (config.doubleJump) {
    airborneStates.splice(1, 0, "jump_double");
  }

  // ── Build transitions ────────────────────────────────────────────────
  // Transitions are evaluated in order; the first matching one wins.

  const jumpEvent = config.jump.event ?? "jump";
  const transitions: Array<{
    from: string | string[] | "*";
    to: string;
    on?: string;
    when?: (ctx: MoverAnimMachineContext<TContext>) => boolean;
  }> = [
    // 1. Jump: triggered by event from grounded (or custom) states
    {
      from: config.jump.from ?? groundedStates,
      to: "jump",
      on: jumpEvent,
    },
  ];

  // 2. Double jump: triggered by event while already airborne
  if (config.doubleJump) {
    transitions.push({
      from: config.doubleJump.from ?? ["jump", "falling"],
      to: "jump_double",
      on: config.doubleJump.event ?? jumpEvent,
    });
  }

  const directGroundTargets = ["idle", "walk", "run", "sprint"];

  // 3. Air-to-ground: either go through landing or snap to locomotion
  if (config.landing) {
    // With landing: airborne -> landing (one-shot clip on touchdown)
    transitions.push({
      from: config.landing.from ?? airborneStates,
      to: "landing",
      when: config.landing.when ?? ((ctx) => ctx.mover.grounded),
    });
  } else {
    // Without landing: airborne -> locomotion directly based on speed
    for (const target of directGroundTargets) {
      transitions.push({
        from: airborneStates,
        to: target,
        when: (ctx) =>
          ctx.mover.grounded && resolveLocomotionState(ctx) === target,
      });
    }
  }

  // 4. Jump -> falling: when the jump apex is passed (user-defined guard)
  transitions.push({
    from: "jump",
    to: "falling",
    when: config.jump.toFallWhen,
  });

  if (config.doubleJump) {
    transitions.push({
      from: "jump_double",
      to: "falling",
      when: config.doubleJump.toFallWhen ?? config.jump.toFallWhen,
    });
  }

  // 5. Ground -> falling: walking off a ledge (not a jump)
  transitions.push({
    from: groundedStates,
    to: "falling",
    when:
      config.fall.fromGroundWhen ??
      ((ctx) => !ctx.mover.grounded && ctx.stateTime > 0),
  });

  // 6. Landing -> locomotion: after the landing clip finishes
  if (config.landing) {
    const exitWhen =
      config.landing.exitWhen ?? ((ctx: MoverAnimMachineContext<TContext>) => ctx.finished && ctx.mover.grounded);

    for (const target of directGroundTargets) {
      transitions.push({
        from: "landing",
        to: target,
        when: (ctx) =>
          exitWhen(ctx) &&
          resolveLocomotionState(ctx) === target,
      });
    }
  }

  // 7. Locomotion <-> locomotion: switch between idle/walk/run/sprint
  for (const target of directGroundTargets) {
    transitions.push({
      from: directGroundTargets.filter((state) => state !== target),
      to: target,
      when: (ctx) =>
        ctx.mover.grounded && resolveLocomotionState(ctx) === target,
    });
  }

  const machine = new AnimationStateMachine<MoverAnimContext<TContext>>({
    body: config.body,
    initial: config.initial ?? "idle",
    context,
    defaultBlendTime: config.defaultBlendTime,
    states,
    transitions,
  });

  const baseSetContext = machine.setContext.bind(machine);
  const baseUpdate = machine.update.bind(machine);
  const baseDispose = machine.dispose.bind(machine);

  const createMachineContext = (): MoverAnimMachineContext<TContext> => ({
    ...extraContext,
    ...runtimeContext,
    mover: config.mover,
    currentState: machine.currentState,
    previousState: machine.previousState,
    stateTime: machine.stateTime,
    finished: machine.finished,
    body: config.body,
  });

  runtimeContext.jumpTakeoffState = resolveLocomotionState(createMachineContext());

  const syncMachineContext = () => {
    baseSetContext({
      ...extraContext,
      ...runtimeContext,
      mover: config.mover,
    } as Partial<MoverAnimContext<TContext>>);
  };

  const handleJumped = (jumpCount: number) => {
    runtimeContext.jumpTakeoffState = resolveLocomotionState(
      createMachineContext()
    );
    runtimeContext.landingVelocityY = config.mover.velocity.y;
    syncMachineContext();

    const event =
      jumpCount > 1 && config.doubleJump
        ? (config.doubleJump.event ?? jumpEvent)
        : jumpEvent;

    machine.send(event);
  };

  machine.setContext = (partial: Partial<MoverAnimContext<TContext>>) => {
    const {
      mover: _ignoredMover,
      jumpTakeoffState: _ignoredJumpTakeoffState,
      landingVelocityY: _ignoredLandingVelocityY,
      ...nextContext
    } = partial as Partial<MoverAnimContext<TContext>>;

    if (Object.keys(nextContext).length === 0) return;

    extraContext = {
      ...extraContext,
      ...(nextContext as Partial<TContext>),
    };

    syncMachineContext();
  };

  machine.update = (dt: number) => {
    if (!config.mover.grounded) {
      runtimeContext.landingVelocityY = config.mover.velocity.y;
      syncMachineContext();
    }
    baseUpdate(dt);
  };

  machine.dispose = () => {
    config.mover.off("jumped", handleJumped);
    baseDispose();
  };

  config.mover.on("jumped", handleJumped);

  return machine;
}
