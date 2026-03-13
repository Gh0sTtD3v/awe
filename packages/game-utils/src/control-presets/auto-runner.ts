import type { Camera } from "three";
import { Vector3 } from "three";
import type { Component3D, Space } from "@oncyberio/engine";
import {
  Mover,
  FollowCameraRig,
  AnimationStateMachine,
} from "@oncyberio/engine/controls";
import type { JumpConfig } from "@oncyberio/engine/controls";
import type { ControlSystem } from "./types";
import {
  createInputs,
  Keyboard,
  Gamepad,
  Touch,
  Interactions,
} from "@oncyberio/engine/input";

/**
 * Auto-runner preset options
 */
export interface AutoRunnerOptions {
  /** Jump configuration */
  jump?: JumpConfig;
  // Movement (auto-runner has special speed handling)
  /** Base running speed (default: 12) */
  baseSpeed?: number;
  /** Sprint speed (default: 24) */
  sprintSpeed?: number;
  /** Gravity (default: -30) */
  gravity?: number;
  /** Lane width for lane-based runners (default: 3) */
  laneWidth?: number;
  /** Number of lanes, 0 for continuous (default: 0) */
  lanes?: number;

  // Actions
  /** Slide duration in seconds (default: 0.8) */
  slideDuration?: number;
  /** Slide cooldown in seconds (default: 1.5) */
  slideCooldown?: number;

  // Camera
  /** Camera distance (default: 8) */
  cameraDistance?: number;
  /** Camera height offset (default: 5) */
  cameraHeight?: number;

  // Boundaries
  /** Track boundaries (optional) */
  track?: {
    minX?: number;
    maxX?: number;
  };

  // Animation
  /** Custom animation state mappings */
  animations?: Record<string, string>;
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
  Jump: {
    type: "button",
    bindings: [
      Keyboard.button("Space"),
      Keyboard.button("KeyW"),
      Keyboard.button("ArrowUp"),
      Gamepad.button("A"),
    ],
    interactions: [Interactions.press()],
  },
  Slide: {
    type: "button",
    bindings: [
      Keyboard.button("KeyS"),
      Keyboard.button("ArrowDown"),
      Gamepad.button("B"),
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
  LaneLeft: {
    type: "button",
    bindings: [
      Keyboard.button("KeyA"),
      Keyboard.button("ArrowLeft"),
      Gamepad.button("DPadLeft"),
    ],
    interactions: [Interactions.press()],
  },
  LaneRight: {
    type: "button",
    bindings: [
      Keyboard.button("KeyD"),
      Keyboard.button("ArrowRight"),
      Gamepad.button("DPadRight"),
    ],
    interactions: [Interactions.press()],
  },
} as const;

/**
 * Animation clip names for auto-runner states
 */
interface AutoRunnerAnimations {
  run: string;
  sprint: string;
  jump: string;
  fall: string;
  slide: string;
}

/**
 * Context type for AnimationStateMachine in auto-runner
 */
interface AutoRunnerAnimContext {
  mover: Mover;
}

/**
 * Creates an auto-runner control system.
 * Character always moves forward, player controls lateral movement, jumping, and sliding.
 */
export function createAutoRunner(
  space: Space,
  avatar: Component3D,
  camera: Camera,
  options: AutoRunnerOptions = {}
): ControlSystem {
  const jump = { ...options.jump };

  const baseSpeed = options.baseSpeed ?? 12;
  const sprintSpeed = options.sprintSpeed ?? 24;
  const gravity = options.gravity ?? -1.81;
  const laneWidth = options.laneWidth ?? 3;
  const lanes = options.lanes ?? 0;
  const slideDurationTime = options.slideDuration ?? 0.8;
  const slideCooldownTime = options.slideCooldown ?? 1.5;
  const cameraDistance = options.cameraDistance ?? 8;
  const cameraHeight = options.cameraHeight ?? 5;
  const track = options.track;

  // Create inputs with direct typed access
  const inputs = createInputs(GAMEPLAY_INPUTS);

  // Create follow camera rig - stays behind character, rotates with them
  const cameraRig = new FollowCameraRig({
    camera,
    target: avatar,
    offset: new Vector3(0, cameraHeight, cameraDistance),
    rotateWithTarget: true,
  });

  // Create mover (auto-runner uses baseSpeed instead of speed)
  const mover = new Mover({
    body: avatar,
    target: camera,
    movement: {
      speed: baseSpeed,
      gravity,
      acceleration: 200,
      airControl: 1.0,
      facingMode: "none",
    },
    jump,
    track,
  });

  // Animation clip mappings with defaults
  const anims: AutoRunnerAnimations = {
    run: options.animations?.run ?? "run",
    sprint: options.animations?.sprint ?? "sprint",
    jump: options.animations?.jump ?? "jump",
    fall: options.animations?.fall ?? "falling",
    slide: options.animations?.slide ?? "slide",
  };

  // Slide state (timed ability with cooldown)
  let slideActive = false;
  let slideElapsed = 0;
  let slideCooldownRemaining = 0;

  const tryStartSlide = (): boolean => {
    if (slideCooldownRemaining > 0) return false;
    if (slideActive) return false;
    if (!mover.grounded) return false;

    slideActive = true;
    slideElapsed = 0;
    return true;
  };

  const endSlide = () => {
    if (!slideActive) return;
    slideActive = false;
    slideCooldownRemaining = slideCooldownTime;
    animStateMachine.send("slideEnd");
  };

  const updateSlide = (dt: number) => {
    // Update cooldown
    if (slideCooldownRemaining > 0) {
      slideCooldownRemaining = Math.max(0, slideCooldownRemaining - dt);
    }

    if (!slideActive) return;

    slideElapsed += dt;

    // Check for duration-based end
    if (slideElapsed >= slideDurationTime) {
      endSlide();
    }
  };

  // Create AnimationStateMachine with priority-based transitions
  const animStateMachine = new AnimationStateMachine<AutoRunnerAnimContext>({
    body: avatar,
    initial: "run",
    context: { mover },
    defaultBlendTime: 0.1,

    states: {
      run: { clip: anims.run },
      sprint: { clip: anims.sprint },
      jump: { clip: anims.jump, loop: "once" },
      fall: { clip: anims.fall },
      slide: {
        clip: anims.slide,
        loop: "once",
      },
    },

    transitions: [
      // Priority 100: Event-driven slide (highest priority)
      {
        from: ["run", "sprint"],
        to: "slide",
        on: "slide",
        guard: (ctx) => ctx.mover.grounded,
        priority: 100,
      },
      // Jump interrupts slide
      {
        from: "slide",
        to: "jump",
        on: "jump",
        priority: 100,
      },

      // Priority 60-50: Slide complete -> return to movement (event-based)
      {
        from: "slide",
        to: "sprint",
        on: "slideEnd",
        guard: (ctx) => ctx.mover.grounded && ctx.mover.speed >= 15,
        priority: 60,
      },
      {
        from: "slide",
        to: "run",
        on: "slideEnd",
        priority: 50,
      },

      // Priority 40: Airborne states
      {
        from: ["run", "sprint"],
        to: "jump",
        on: "jump",
        priority: 40,
      },
      {
        from: "*",
        to: "jump",
        when: (ctx) => !ctx.mover.grounded && ctx.mover.velocity.y >= 0,
        priority: 40,
      },
      {
        from: "*",
        to: "fall",
        when: (ctx) => !ctx.mover.grounded && ctx.mover.velocity.y < 0,
        priority: 40,
      },

      // Priority 20: Grounded movement (lowest priority)
      {
        from: ["run", "sprint", "jump", "fall"],
        to: "sprint",
        when: (ctx) => ctx.mover.grounded && ctx.mover.speed >= 15,
        priority: 20,
      },
      {
        from: ["run", "sprint", "jump", "fall"],
        to: "run",
        when: (ctx) => ctx.mover.grounded && ctx.mover.speed < 15,
        priority: 20,
      },
    ],
  });

  // Wire up event-driven input
  inputs.Jump.onPerformed(() => {
    const jumped = mover.startJump();
    if (jumped) {
      if (slideActive) {
        endSlide();
      }
      animStateMachine.send("jump");
    }
  });

  inputs.Slide.onPerformed(() => {
    const started = tryStartSlide();
    if (started) {
      animStateMachine.send("slide");
    }
  });

  // Lane-based movement state
  let currentLane = 0;

  // State
  let active = true;
  let disposed = false;

  // Fixed update - called 0-N times per frame
  const onFixedUpdate = (dt: number) => {
    if (!active || disposed) return;

    // Update input map with fixed context
    inputs.update(dt);

    // Process input
    const moveDir = inputs.Move.readValue();
    const moveX = moveDir.x;
    const isSprinting = inputs.Sprint.isPressed;

    // Handle lane-based movement
    if (lanes > 0) {
      if (inputs.LaneLeft.wasJustPressed) {
        currentLane = Math.max(-(lanes - 1) / 2, currentLane - 1);
      }
      if (inputs.LaneRight.wasJustPressed) {
        currentLane = Math.min((lanes - 1) / 2, currentLane + 1);
      }
    }

    // Apply movement
    const speed = isSprinting ? sprintSpeed : baseSpeed;
    mover.move(moveX, 1, speed); // Always move forward (Y locked to 1)

    // Handle jump hold release
    if (jump.hold && inputs.Jump.wasJustReleased) {
      mover.releaseJump();
    }

    // Update systems
    mover.update(dt);
    updateSlide(dt);
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

  /** @deprecated No longer needed - sharedControlState auto-updates */
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
        animStateMachine.forceState("run");
      }
    },
  };
}
