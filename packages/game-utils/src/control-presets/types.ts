import type {
  Mover,
  AnyCameraRig,
  AnimationStateMachine,
  JumpConfig,
  MovementConfig,
} from "@oncyberio/engine/controls";
import type { InputsHelpers } from "@oncyberio/engine/input";

export type ControlCameraRig = AnyCameraRig & {
  requestPointerLock?(): void;
  setLockAxis?(axis: { x?: boolean; y?: boolean }): void;
};

/**
 * Common interface returned by all preset factories.
 * Provides access to individual primitives for customization.
 */
export interface ControlSystem {
  /** Inputs for this control system (with helpers for update/enable/disable/dispose) */
  inputs: InputsHelpers;
  /** Movement controller */
  mover: Mover;
  /** Camera rig (FirstPersonCameraRig, ThirdPersonCameraRig, FlyCameraRig, or FollowCameraRig) */
  cameraRig: ControlCameraRig;
  /** Animation state machine for explicit state-based animation control */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animStateMachine?: AnimationStateMachine<any>;

  /** Lifecycle - manual update (for testing or non-event-driven usage) */
  update(dt: number): void;
  /** @deprecated Preserved for backward compatibility; presets are space-driven now */
  lateUpdate?(): void;
  /** Cleanup */
  dispose(): void;

  /** Whether controls are active */
  active: boolean;
}

// Re-export mover config types directly.
export type { MovementConfig, JumpConfig };
