import type { Camera } from "three";
import type { Component3D, Space } from "@oncyberio/engine";
import { Mover, FirstPersonCameraRig } from "@oncyberio/engine/controls";
import type { MovementConfig, JumpConfig } from "@oncyberio/engine/controls";
import type { ControlSystem } from "./types";
import {
  createInputs,
  Keyboard,
  Gamepad,
  Mouse,
  Touch,
  Interactions,
} from "@oncyberio/engine/input";

/**
 * FPS preset options
 */
export interface FPSOptions {
  /** Movement configuration */
  movement?: MovementConfig;
  /** Jump configuration */
  jump?: JumpConfig;
  /** Sprint speed multiplier (default: 1.5) */
  sprintMultiplier?: number;

  // Camera
  /** Mouse sensitivity (default: { x: 0.5, y: 0.4 }) */
  sensitivity?: { x: number; y: number };
  /** Invert Y axis (default: false) */
  invertY?: boolean;
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
    bindings: [Mouse.pointerLockDelta(), Gamepad.rightStick()],
  },
  Jump: {
    type: "button",
    bindings: [Keyboard.button("Space"), Gamepad.button("A")],
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
  speed: 8,
  gravity: -1.81,
  acceleration: 200,
  airControl: 1,
  autoRotate: false,
};

const DEFAULT_JUMP: JumpConfig = {
  maxJumps: 1,
};

/**
 * Creates an FPS control system.
 * First-person view with WASD movement relative to camera facing.
 */
export function createFPS(
  space: Space,
  avatar: Component3D,
  camera: Camera,
  options: FPSOptions = {},
): ControlSystem {
  const movement = { ...DEFAULT_MOVEMENT, ...options.movement };
  const jump = { ...DEFAULT_JUMP, ...options.jump };

  const sprintMultiplier = options.sprintMultiplier ?? 1.5;
  const sensitivity = options.sensitivity ?? { x: 0.5, y: 0.4 };
  const invertY = options.invertY ?? false;

  // Create inputs with direct typed access
  const inputs = createInputs(GAMEPLAY_INPUTS);

  // Create first-person camera rig
  const cameraRig = new FirstPersonCameraRig({
    camera,
    target: avatar,
    height: 1.6, // Eye level
    sensitivity,
    invertY,
  });

  // Create mover
  const mover = new Mover({
    body: avatar,
    target: camera,
    movement,
    jump,
  });

  // Wire up event-driven jump input
  inputs.Jump.onPerformed(() => {
    mover.startJump();
  });

  // Hide avatar for true FPS (optional - user can show it)
  avatar.visible = false;

  // State
  let active = true;
  let disposed = false;

  // Fixed update - called 0-N times per frame
  const onFixedUpdate = (dt: number) => {
    if (!active || disposed) return;

    // Update inputs
    inputs.update(dt);

    // Process input
    const moveDir = inputs.Move.readValue();
    const lookDelta = inputs.Look.readValue();
    const isSprinting = inputs.Sprint.isPressed;

    // Handle camera look input (only when pointer is locked, or pointer lock is disabled)
    if (lookDelta.x !== 0 || lookDelta.y !== 0) {
      cameraRig.rotate(lookDelta.x, lookDelta.y);
    }

    // Move relative to camera direction
    const speed = isSprinting
      ? (movement.speed ?? 8) * sprintMultiplier
      : movement.speed;
    mover.move(moveDir.x, moveDir.y, {
      forward: cameraRig.forward,
      right: cameraRig.right,
      speed,
    });

    // Handle jump hold release
    if (jump.hold && inputs.Jump.wasJustReleased) {
      mover.releaseJump();
    }

    // Update systems
    mover.update(dt);
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
    // Restore avatar visibility that was hidden for FPS view
    avatar.visible = true;
  };

  // Public update method for manual usage (backward compatibility)
  const update = (dt: number) => {
    onFixedUpdate(dt);
  };

  return {
    inputs,
    mover,
    cameraRig,

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
      } else {
        inputs.disable();
      }
      cameraRig.active = val;
    },
  };
}
