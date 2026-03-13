import type { Camera } from "three";
import { Vector3 } from "three";
import type { Component3D, Space } from "@oncyberio/engine";
import { Mover, FollowCameraRig, createMoverAnimStateMachine } from "@oncyberio/engine/controls";
import type { MovementConfig, JumpConfig } from "@oncyberio/engine/controls";
import type { ControlSystem } from "./types";
import {
  createInputs,
  Keyboard,
  Gamepad,
  Touch,
  Composite,
  Interactions,
} from "@oncyberio/engine/input";

/**
 * Animation clip names for side-scroller states
 */
export interface SideScrollerAnimations {
  idle: string;
  walk: string;
  run: string;
  sprint: string;
  jump: string;
  fall: string;
}

/**
 * Side-scroller preset options
 */
export interface SideScrollerOptions {
  /** Movement configuration */
  movement?: MovementConfig;
  /** Jump configuration */
  jump?: JumpConfig;
  /** Speed boost multiplier when sprinting (default: 1.5) */
  sprintBoost?: number;

  // Camera
  /** Camera distance from target on X axis (default: 12) */
  cameraDistance?: number;
  /** Camera height offset (default: 2) */
  cameraHeight?: number;
  /** Camera depth offset on Z axis - positive = behind player (default: 0) */
  cameraDepth?: number;
  /** Camera smoothing factor (default: 0.1) */
  cameraSmoothing?: number;

  // Animation
  /** Custom animation clip mappings (partial override of defaults) */
  animations?: Partial<SideScrollerAnimations>;
}

// ---- Input Action Definitions ----

const GAMEPLAY_INPUTS = {
  MoveX: {
    type: "value",
    bindings: [
      Composite.axis1D(Keyboard.axis("KeyA"), Keyboard.axis("KeyD")),
      Composite.axis1D(
        Keyboard.axis("ArrowLeft"),
        Keyboard.axis("ArrowRight")
      ),
      Gamepad.axis("LeftX"),
      Touch.joystickAxis("x"),
    ],
  },
  Jump: {
    type: "button",
    bindings: [Keyboard.button("Space"), Gamepad.button("A"), Touch.tap()],
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

const DEFAULT_MOVEMENT: MovementConfig = {
  speed: 12,
  gravity: -1.81,
  acceleration: 100,
  deceleration: 50,
  airControl: 1,
  autoRotate: true,
};

/**
 * Creates a 2.5D side-scroller control system.
 * Camera is fixed to the side, movement restricted to left/right + jump.
 */
export function createSideScroller(
  space: Space,
  avatar: Component3D,
  camera: Camera,
  options: SideScrollerOptions = {}
): ControlSystem {
  const movement = { ...DEFAULT_MOVEMENT, ...options.movement };
  const jump = { ...options.jump };

  const sprintBoost = options.sprintBoost ?? 1.5;
  const cameraDistance = options.cameraDistance ?? 12;
  const cameraHeight = options.cameraHeight ?? 2;
  const cameraDepth = options.cameraDepth ?? 0;
  const cameraSmoothing = options.cameraSmoothing ?? 0.1;

  // Animation clip mappings with defaults
  const anims: SideScrollerAnimations = {
    idle: options.animations?.idle ?? "idle",
    walk: options.animations?.walk ?? "walk",
    run: options.animations?.run ?? "run",
    sprint: options.animations?.sprint ?? "sprint",
    jump: options.animations?.jump ?? "jump",
    fall: options.animations?.fall ?? "falling",
  };

  // Create inputs with direct typed access
  const inputs = createInputs(GAMEPLAY_INPUTS);

  // Create camera rig: fixed side view with offset on X axis
  const cameraRig = new FollowCameraRig({
    camera,
    target: avatar,
    offset: new Vector3(
      cameraDistance,
      cameraHeight,
      cameraDepth
    ),
    rotateWithTarget: false,
    smoothing: cameraSmoothing,
  });

  // Create mover with physics-based jump configuration
  const mover = new Mover({
    body: avatar,
    target: camera,
    movement,
    jump,
  });

  // Direction vectors for side-scrolling (movement on Z axis)
  const forward = new Vector3(0, 0, -1);
  const right = new Vector3(1, 0, 0);

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
    resolveLocomotionState: (ctx) => {
      if (ctx.mover.speed >= 15) return "sprint";
      if (ctx.mover.speed >= 8) return "run";
      if (ctx.mover.speed >= 0.5) return "walk";
      return "idle";
    },
    jump: {
      clip: anims.jump,
      toFallWhen: (ctx) => !ctx.mover.grounded && ctx.mover.velocity.y < 0,
    },
    fall: {
      clip: anims.fall,
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

    // Handle movement - moveX maps to Z-axis movement
    const moveX = inputs.MoveX.readValue() as number;
    const isSprinting = inputs.Sprint.isPressed;
    const speed = isSprinting ? (movement.speed ?? 12) * sprintBoost : movement.speed;

    // Use explicit direction vectors for side-scrolling
    mover.move(0, moveX, { forward, right, speed });

    // Handle jump hold release
    if (jump.hold && inputs.Jump.wasJustReleased) {
      mover.releaseJump();
    }

    // Update systems
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

  const update = (dt: number) => {
    onFixedUpdate(dt);
  };

  const lateUpdate = () => {};

  return {
    inputs,
    mover,
    cameraRig,
    animStateMachine,

    update,
    lateUpdate,
    dispose,

    get active() {
      return active;
    },
    set active(val: boolean) {
      active = val;
      if (val) {
        inputs.enable();
        mover.reset();
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
