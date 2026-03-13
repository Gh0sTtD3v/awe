/**
 * Controls - Fresh architecture for player controls
 *
 * Design Philosophy:
 * 1. Primitives over monoliths - Small, focused, composable pieces
 * 2. Data-driven - Configuration objects, not class hierarchies
 * 3. Archetypes as compositions - Platformer, FPS, auto-runner built from same primitives
 * 4. Explicit state flow - Clear inputs → processing → outputs
 *
 * @example
 * ```ts
 * import { Mover, Action } from ".";
 *
 * // Compose your own primitives
 * const mover = new Mover({ body: avatar, speed: 10, gravity: -25 });
 * ```
 */

// Movement
export { Mover } from "./mover";
export type {
  MoverConfig,
  MoverEvents,
  MoverState,
  JumpConfig,
  MoverFacingMode,
  MovementConfig,
  MoveOptions,
} from "./mover";

// Animation State Machine
export { AnimationStateMachine } from "./animation-state-machine";
export type {
  AnimationStateMachineConfig,
  StateConfig,
  TransitionConfig,
  AnimationContext,
  TransitionInfo,
} from "./animation-state-machine";
export { createMoverAnimStateMachine } from "./mover-anim-state";
export type {
  MoverAnimStateMachineConfig,
  MoverAnimRuntimeContext,
  MoverAnimContext,
  MoverAnimMachineContext,
  MoverAnimLocomotionState,
  MoverAnimAirState,
  MoverAnimState,
  MoverAnimSpeedCategory,
  MoverAnimSpeedThresholds,
} from "./mover-anim-state";
export {
  getMoverAnimSpeedCategory,
  getMoverAnimLocomotionState,
} from "./mover-anim-state";

// Legacy CameraRig (deprecated - use specialized camera rigs below)
export { CameraRig } from "./camera-rig";
export type {
  CameraRigConfig,
  CameraRigMode,
  CameraRigState,
} from "./camera-rig";

// Specialized Camera Rigs
export {
  FirstPersonCameraRig,
  ThirdPersonCameraRig,
  FlyCameraRig,
  FollowCameraRig,
} from "./camera-rigs";
export type {
  FirstPersonCameraRigConfig,
  FirstPersonCameraRigState,
  ThirdPersonCameraRigConfig,
  ThirdPersonCameraRigState,
  FlyCameraRigConfig,
  FlyCameraActions,
  FlyCameraRigState,
  FollowCameraRigConfig,
  FollowCameraRigState,
  AnyCameraRig,
  AnyCameraRigState,
} from "./camera-rigs";

// State management
export { State, derived, createCounter, createHealthState } from "./state";
export type { StateListener } from "./state";
