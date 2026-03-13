import type { Camera } from "three";
import type { Component3D, Space } from "@oncyberio/engine";
import {
  Mover,
  ThirdPersonCameraRig,
  createMoverAnimStateMachine,
} from "@oncyberio/engine/controls";
import type {
  MoverAnimLocomotionState,
  MoverAnimSpeedThresholds,
  MovementConfig,
  JumpConfig,
} from "@oncyberio/engine/controls";
import {
  createInputs,
  Keyboard,
  Gamepad,
  Mouse,
  Touch,
  Custom,
  withProcessors,
  Interactions,
  Processors,
} from "@oncyberio/engine/input";

/**
 * Animation clip names for platformer states
 */
export interface PlatformerAnimations {
  idle: string;
  walk: string;
  run: string;
  sprint: string;
  jump_idle: string;
  jump_walking: string;
  jump_running: string;
  jump_sprinting: string;
  jump_double: string;
  falling: string;
  drop_idle: string;
  drop_walking: string;
  drop_walking_roll: string;
  drop_running: string;
  drop_running_roll: string;
  drop_sprinting: string;
  drop_sprinting_roll: string;
}

/**
 * Platformer preset options
 */
export interface PlatformerOptions {
  /** Movement configuration */
  movement?: MovementConfig;
  /** Jump configuration */
  jump?: JumpConfig;
  /** Speed boost multiplier when sprinting (default: 1.5) */
  sprintBoost?: number;
  /**
   * Locomotion speed thresholds used to classify walk vs run vs sprint clips.
   * Defaults to `{ walk: 10, sprint: speed * sprintBoost }`.
   */
  locomotionThresholds?: Partial<MoverAnimSpeedThresholds>;

  // Camera
  /** Camera mode (default: "orbit") */
  cameraMode?: "orbit" | "follow";
  /** Camera distance from target (default: 5) */
  cameraDistance?: number;
  /** Camera height offset (default: 0) */
  cameraHeight?: number;
  /** Camera collision checking (default: true) */
  cameraCollision?: boolean;
  /** Camera smoothing factor (default: 0.15) */
  cameraSmoothing?: number;

  // Animation
  /** Custom animation clip mappings (partial override of defaults) */
  animations?: Partial<PlatformerAnimations>;
}

// ---- Input Action Definitions ----

const GAMEPLAY_INPUTS = {
  Move: {
    type: "vector2",
    bindings: [
      Keyboard.wasd(),
      Keyboard.arrows(),
      Gamepad.leftStick(),
      Gamepad.dpad(),
      Touch.joystick(),
    ],
  },
  Look: {
    type: "vector2",
    bindings: [
      Mouse.pointerLockDelta(),
      withProcessors(Touch.delta(), Processors.scaleVector2(-1)),
      Gamepad.rightStick(),
    ],
  },
  Zoom: {
    type: "value",
    bindings: [Mouse.wheel()],
  },
  Jump: {
    type: "button",
    bindings: [
      Keyboard.button("Space"),
      Gamepad.button("A"),
      Custom.button("jump"),
    ],
    interactions: [Interactions.press()],
  },
  Sprint: {
    type: "button",
    bindings: [
      Keyboard.button("ShiftLeft"),
      Keyboard.button("ShiftRight"),
      Gamepad.button("LB"),
    ],
  },
} as const;

function getJumpClip(
  anims: PlatformerAnimations,
  jumpTakeoffState: MoverAnimLocomotionState,
): string {
  switch (jumpTakeoffState) {
    case "walk":
      return anims.jump_walking;
    case "run":
      return anims.jump_running;
    case "sprint":
      return anims.jump_sprinting;
    case "idle":
    default:
      return anims.jump_idle;
  }
}

function getLandingClip(
  anims: PlatformerAnimations,
  jumpTakeoffState: MoverAnimLocomotionState,
  landingVelocityY: number,
): string {
  const isRollLanding = landingVelocityY < -0.6;

  switch (jumpTakeoffState) {
    case "walk":
      return isRollLanding ? anims.drop_walking_roll : anims.drop_walking;
    case "run":
      return isRollLanding ? anims.drop_running_roll : anims.drop_running;
    case "sprint":
      return isRollLanding ? anims.drop_sprinting_roll : anims.drop_sprinting;
    case "idle":
    default:
      return anims.drop_idle;
  }
}

const DEFAULT_MOVEMENT: Required<MovementConfig> = {
  speed: 15,
  gravity: -1.81,
  acceleration: 100,
  deceleration: 50,
  airControl: 1,
  autoRotate: true,
};

const DEFAULT_JUMP: Required<JumpConfig> = {
  height: 5,
  duration: 1,
  maxJumps: 2,
  coyoteTime: Infinity,
  maxFallSpeed: 20,
  hold: false,
  delay: 0,
  peakSpeed: 1,
};

/**
 * Creates a platformer control system.
 *
 * @example
 * ```ts
 * const controls = createPlatformer(space, avatar, camera, {
 *   movement: { speed: 12 },
 *   jump: { height: 10 },
 *   cameraDistance: 8,
 * });
 * ```
 */
export function createPlatformer(
  space: Space,
  avatar: Component3D,
  camera: Camera,
  options: PlatformerOptions = {},
) {
  const movement: Required<MovementConfig> = {
    ...DEFAULT_MOVEMENT,
    ...options.movement,
  };
  const jump: Required<JumpConfig> = { ...DEFAULT_JUMP, ...options.jump };

  const sprintBoost = options.sprintBoost ?? 1.5;
  const cameraMode = options.cameraMode ?? "orbit";
  const cameraDistance = options.cameraDistance ?? 5;
  const cameraHeight = options.cameraHeight ?? 0;
  const cameraCollision = options.cameraCollision ?? true;
  const cameraSmoothing = options.cameraSmoothing ?? 0.15;

  // Animation clip mappings with defaults
  const anims: PlatformerAnimations = {
    idle: options.animations?.idle ?? "idle",
    walk: options.animations?.walk ?? "walk",
    run: options.animations?.run ?? "run",
    sprint: options.animations?.sprint ?? "sprint",
    jump_idle: options.animations?.jump_idle ?? "jump_idle",
    jump_walking: options.animations?.jump_walking ?? "jump_walking",
    jump_running: options.animations?.jump_running ?? "jump_running",
    jump_sprinting: options.animations?.jump_sprinting ?? "jump_sprinting",
    jump_double: options.animations?.jump_double ?? "jump_double",
    falling: options.animations?.falling ?? "falling",
    drop_idle: options.animations?.drop_idle ?? "drop_idle",
    drop_walking: options.animations?.drop_walking ?? "drop_walking",
    drop_walking_roll:
      options.animations?.drop_walking_roll ?? "drop_walking_roll",
    drop_running: options.animations?.drop_running ?? "drop_running",
    drop_running_roll:
      options.animations?.drop_running_roll ?? "drop_running_roll",
    drop_sprinting: options.animations?.drop_sprinting ?? "drop_sprinting",
    drop_sprinting_roll:
      options.animations?.drop_sprinting_roll ?? "drop_sprinting_roll",
  };

  const locomotionThresholds: MoverAnimSpeedThresholds = {
    walk: options.locomotionThresholds?.walk ?? 10,
    sprint:
      options.locomotionThresholds?.sprint ?? movement.speed * sprintBoost,
  };

  // Create inputs with direct typed access
  const inputs = createInputs(GAMEPLAY_INPUTS);

  // Create third-person camera rig (mover needs it for direction reference)
  const cameraRig = new ThirdPersonCameraRig({
    camera,
    target: avatar,
    distance: cameraDistance,
    height: cameraHeight,
    collision: cameraCollision,
    smoothing: cameraSmoothing,
    // Note: cameraMode "orbit" vs "follow" is controlled via smoothMethod
    smoothMethod: cameraMode === "follow" ? "position" : "orbit",
  });

  // Create mover with physics-based jump configuration
  const mover = new Mover({
    body: avatar,
    target: camera,
    movement,
    jump,
  });

  // Create a phase-based animation state machine.
  // Clip variants are resolved inside `jump` and `landing` from machine context.
  const animStateMachine = createMoverAnimStateMachine({
    body: avatar,
    mover,
    defaultBlendTime: 0.1,
    locomotionClips: {
      idle: anims.idle,
      walk: anims.walk,
      run: anims.run,
      sprint: anims.sprint,
    },
    locomotionThresholds,
    jump: {
      clip: (ctx) => getJumpClip(anims, ctx.jumpTakeoffState),
      toFallWhen: (ctx) => ctx.finished && !ctx.mover.grounded,
    },
    doubleJump: {
      clip: anims.jump_double,
    },
    fall: {
      clip: anims.falling,
    },
    landing: {
      clip: (ctx) =>
        getLandingClip(anims, ctx.jumpTakeoffState, ctx.landingVelocityY),
    },
  });

  // Wire up event-driven jump input
  inputs.Jump.onPerformed(() => {
    mover.startJump();
  });

  // State
  let active = true;
  let disposed = false;

  // Fixed update - called 0-N times per frame
  const onFixedUpdate = (dt: number) => {
    if (!active || disposed) return;

    // Update input map with fixed context
    inputs.update(dt);

    // Process input (polling for continuous values)
    const moveDir = inputs.Move.readValue();
    const isSprinting = inputs.Sprint.isPressed;
    const speed = isSprinting ? movement.speed * sprintBoost : movement.speed;

    const lookDelta = inputs.Look.readValue();
    const zoomDelta = inputs.Zoom.readValue();

    cameraRig.rotate(lookDelta.x, lookDelta.y);
    cameraRig.zoom(zoomDelta * 0.1);
    mover.move(moveDir.x, moveDir.y, speed);

    if (inputs.Jump.wasJustPressed) {
      mover.startJump();
    }

    if (inputs.Jump.wasJustReleased && jump.hold) {
      mover.releaseJump();
    }

    mover.update(dt);
    animStateMachine.update(dt);
  };

  // Subscribe via public Space API
  const unsubscribe = space.use({
    onFixedUpdate,
    onDispose: () => dispose(),
  });

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    active = false;
    unsubscribe();
    inputs.dispose();
    mover.dispose();
    cameraRig.dispose();
    animStateMachine.dispose();
  };

  // Public update method for manual usage (backward compatibility)
  const update = (dt: number) => {
    onFixedUpdate(dt);
  };

  return {
    inputs,
    mover,
    cameraRig,
    animStateMachine,

    update,
    dispose,

    get active() {
      return active;
    },
    set active(val: boolean) {
      active = val;
      if (val) {
        inputs.enable();
        // Reset mover velocity to avoid position jump on first update
        mover.reset();
        animStateMachine.forceState("idle");
      } else {
        inputs.disable();
      }
      cameraRig.active = val;
      animStateMachine.enabled = val;
      if (!val) {
        animStateMachine.forceState("idle");
      }
    },
  };
}
