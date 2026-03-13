import { Vector3 } from "three";
import type { Camera } from "three";
import type { Component3D, Space } from "@oncyberio/engine";
import { Mover, FollowCameraRig, AnimationStateMachine } from "@oncyberio/engine/controls";
import type { MovementConfig } from "@oncyberio/engine/controls";
import type { ControlSystem } from "./types";
import {
  createInputs,
  Keyboard,
  Gamepad,
  Touch,
  Interactions,
} from "@oncyberio/engine/input";

/**
 * Animation clip names for top-down states
 */
export interface TopDownAnimations {
  idle: string;
  run: string;
  dash: string;
}

/**
 * Top-down preset options
 */
export interface TopDownOptions {
  /** Movement configuration */
  movement?: MovementConfig;
  // Dash
  /** Dash distance/speed (default: 40) */
  dashSpeed?: number;
  /** Dash duration in seconds (default: 0.15) */
  dashDuration?: number;
  /** Dash cooldown in seconds (default: 1) */
  dashCooldown?: number;

  // Camera
  /** Camera height above target (default: 20) */
  cameraHeight?: number;

  // Animation
  /** Custom animation clip mappings (partial override of defaults) */
  animations?: Partial<TopDownAnimations>;
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
  Dash: {
    type: "button",
    bindings: [Keyboard.button("Space"), Gamepad.button("A")],
    interactions: [Interactions.press()],
  },
  Action: {
    type: "button",
    bindings: [Keyboard.button("KeyE"), Gamepad.button("X")],
    interactions: [Interactions.press()],
  },
} as const;

const DEFAULT_MOVEMENT: MovementConfig = {
  speed: 10,
  gravity: 0,
  acceleration: 125,
  airControl: 1,
  autoRotate: true,
};

/**
 * Context type for AnimationStateMachine in top-down
 */
interface TopDownAnimContext {
  mover: Mover;
  /** Whether currently dashing */
  isDashing: boolean;
}

/**
 * Creates a top-down control system.
 * Camera is fixed above the character, movement is on the XZ plane.
 */
export function createTopDown(
  space: Space,
  avatar: Component3D,
  camera: Camera,
  options: TopDownOptions = {}
): ControlSystem {
  const movement = { ...DEFAULT_MOVEMENT, ...options.movement };

  const dashSpeed = options.dashSpeed ?? 40;
  const dashDuration = options.dashDuration ?? 0.15;
  const dashCooldownTime = options.dashCooldown ?? 1;
  const cameraHeight = options.cameraHeight ?? 20;

  // Animation clip mappings with defaults
  const anims: TopDownAnimations = {
    idle: options.animations?.idle ?? "idle",
    run: options.animations?.run ?? "run",
    dash: options.animations?.dash ?? "dash",
  };

  // Create inputs with direct typed access
  const inputs = createInputs(GAMEPLAY_INPUTS);

  // Create follow camera rig (top-down view)
  const cameraRig = new FollowCameraRig({
    camera,
    target: avatar,
    offset: new Vector3(0, cameraHeight, 0),
  });

  // Create mover with no gravity (top-down is typically 2D-style movement)
  const mover = new Mover({
    body: avatar,
    movement,
  });

  // Store last movement direction for dash
  let lastMoveDir = new Vector3(0, 0, -1);

  // Dash state tracking
  let isDashing = false;
  let dashTimer = 0;
  let dashCooldownTimer = 0;

  // Create AnimationStateMachine with state-based animation control
  const animStateMachine = new AnimationStateMachine<TopDownAnimContext>({
    body: avatar,
    initial: "idle",
    context: { mover, isDashing: false },
    defaultBlendTime: 0.1,

    states: {
      idle: { clip: anims.idle },
      run: { clip: anims.run },
      dash: { clip: anims.dash, loop: "once" },
    },

    transitions: [
      // Priority 100: Event-based dash transition
      {
        from: ["idle", "run"],
        to: "dash",
        on: "dash",
        priority: 100,
      },

      // Priority 50: Dash complete -> return to movement state
      {
        from: "dash",
        to: "run",
        when: (ctx) => !ctx.isDashing && ctx.mover.speed >= 0.5,
        priority: 50,
      },
      {
        from: "dash",
        to: "idle",
        when: (ctx) => !ctx.isDashing && ctx.mover.speed < 0.5,
        priority: 50,
      },

      // Priority 20: Grounded speed transitions
      {
        from: "idle",
        to: "run",
        when: (ctx) => ctx.mover.speed >= 0.5,
        priority: 20,
      },
      {
        from: "run",
        to: "idle",
        when: (ctx) => ctx.mover.speed < 0.5,
        priority: 20,
      },
    ],
  });

  // Wire up event-driven dash input
  inputs.Dash.onPerformed(() => {
    if (dashCooldownTimer > 0 || isDashing) return;

    isDashing = true;
    dashTimer = dashDuration;
    dashCooldownTimer = dashCooldownTime;

    const move = inputs.Move.readValue();
    const moveX = move.x;
    const moveY = move.y;

    let dashDir: Vector3;
    if (Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1) {
      dashDir = new Vector3(moveX, 0, -moveY).normalize();
      lastMoveDir.copy(dashDir);
    } else {
      dashDir = lastMoveDir.clone();
    }

    mover.setVelocity(dashDir.multiplyScalar(dashSpeed));
    animStateMachine.setContext({ isDashing: true });
    animStateMachine.send("dash");
  });

  // State
  let active = true;
  let disposed = false;

  // Fixed update - called 0-N times per frame
  const onFixedUpdate = (dt: number) => {
    if (!active || disposed) return;

    // Update input map with fixed context
    inputs.update(dt);

    // Update dash timer
    if (isDashing) {
      dashTimer -= dt;
      if (dashTimer <= 0) {
        isDashing = false;
        mover.setVelocity(new Vector3(0, 0, 0));
        animStateMachine.setContext({ isDashing: false });
      }
    }

    // Update cooldown timer
    if (dashCooldownTimer > 0) {
      dashCooldownTimer -= dt;
    }

    // Skip normal movement during dash
    if (!isDashing) {
      const move = inputs.Move.readValue();
      const moveX = move.x;
      const moveY = move.y;

      mover.move(moveX, -moveY);

      if (Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1) {
        lastMoveDir.set(moveX, 0, -moveY).normalize();
      }
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
