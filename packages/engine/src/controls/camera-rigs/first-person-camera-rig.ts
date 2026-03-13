import { Camera, Object3D, Euler, Quaternion, Vector3 } from "three";
import emitter from "../../internal/engine-emitter";
import { EngineEvents } from "../../internal/engine-events";
import {
  BaseCameraRig,
  BaseCameraRigConfig,
  IS_MOBILE,
  IS_TOUCH,
  ORIENTATION,
  PORTRAIT,
  applyAxisDampening,
  calculateRotationConversion,
  RotationConversion,
} from "./base-camera-rig";

/**
 * First-person camera rig configuration
 */
export interface FirstPersonCameraRigConfig extends BaseCameraRigConfig {
  /** The target to follow (camera tracks target position) */
  target: Object3D;
  /** Height offset from target position (default: eye level from target dimensions) */
  height?: number;
  /** Invert Y axis (default: false) */
  invertY?: boolean;
}

/**
 * First-person camera rig state for save/restore
 */
export interface FirstPersonCameraRigState {
  yaw: number;
  pitch: number;
  targetQuaternion: { x: number; y: number; z: number; w: number };
}

/**
 * First-person camera rig that positions camera at target's eye level.
 * Uses Euler-based rotation with YXZ order for natural look-around.
 * No smoothing - direct quaternion set for responsive FPS feel.
 *
 * @example
 * ```ts
 * const cameraRig = new FirstPersonCameraRig({
 *   camera: Camera.current,
 *   target: avatar,
 *   sensitivity: { x: 0.5, y: 0.5 },
 * });
 *
 * // Rotation is handled automatically via pointer lock
 * // Camera follows target position at eye level
 * ```
 */
export class FirstPersonCameraRig extends BaseCameraRig {
  private _target: Object3D & { getDimensions?: () => { y: number } };
  private _height: number;
  private _invertY: boolean;

  // Rotation state
  private _euler = new Euler(0, 0, 0, "YXZ");
  private _targetQuat = new Quaternion();
  private _yaw = 0;
  private _pitch = 0;

  // Sensitivity conversion (screen-based)
  private _rotationConversion: RotationConversion;

  constructor(config: FirstPersonCameraRigConfig) {
    super(config);

    this._target = config.target;
    this._height = config.height ?? 0; // 0 means use target dimensions
    this._invertY = config.invertY ?? false;

    this._rotationConversion = calculateRotationConversion();

    // Initialize from target's facing direction
    this._init();

    // Setup pointer lock and activate
    this._setupPointerLock();
    emitter.on(EngineEvents.RESIZE, this._handleResize);
    this.active = true;
  }

  /** Height offset from target position */
  get height(): number {
    return this._height;
  }

  set height(value: number) {
    this._height = value;
  }

  /** Current yaw angle (horizontal rotation) */
  get yaw(): number {
    return this._yaw;
  }

  /** Current pitch angle (vertical rotation) */
  get pitch(): number {
    return this._pitch;
  }

  /**
   * Rotate the camera by screen-space deltas.
   * Uses screen-based sensitivity conversion (matches old FirstPersonCameraControls).
   */
  rotate(deltaX: number, deltaY: number): void {
    // Apply ratio-based axis dampening
    const { dx, dy } = applyAxisDampening(deltaX, deltaY);

    // Convert screen movement to radians using screen-based sensitivity
    const yawDelta = dx * this._rotationConversion.dxToRad;
    const pitchDelta = dy * this._rotationConversion.dyToRad;

    // Update yaw and pitch
    this._yaw -= yawDelta;

    // Pitch direction based on invertY
    const pitchSign = this._invertY ? 1 : -1;
    this._pitch += pitchSign * pitchDelta;

    // Clamp pitch to prevent over-rotation
    this._pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this._pitch));

    // Update target quaternion
    this._euler.set(this._pitch, this._yaw, 0, "YXZ");
    this._targetQuat.setFromEuler(this._euler);
  }

  /**
   * Set rotation directly in radians
   */
  setRotation(yaw: number, pitch: number): void {
    this._yaw = yaw;
    this._pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    this._euler.set(this._pitch, this._yaw, 0, "YXZ");
    this._targetQuat.setFromEuler(this._euler);
  }

  /**
   * Save current state for later restoration
   */
  saveState(): FirstPersonCameraRigState {
    return {
      yaw: this._yaw,
      pitch: this._pitch,
      targetQuaternion: {
        x: this._targetQuat.x,
        y: this._targetQuat.y,
        z: this._targetQuat.z,
        w: this._targetQuat.w,
      },
    };
  }

  /**
   * Restore a previously saved state
   */
  loadState(state: FirstPersonCameraRigState): void {
    this._yaw = state.yaw;
    this._pitch = state.pitch;
    this._targetQuat.set(
      state.targetQuaternion.x,
      state.targetQuaternion.y,
      state.targetQuaternion.z,
      state.targetQuaternion.w
    );
  }

  /**
   * Reset to initial state facing target's direction
   */
  reset(): void {
    this._init();
  }

  dispose(): void {
    if (this._disposed) return;
    emitter.off(EngineEvents.LATE_UPDATE, this._update);
    emitter.off(EngineEvents.RESIZE, this._handleResize);
    super.dispose();
  }

  protected _addEvents(): void {
    emitter.on(EngineEvents.LATE_UPDATE, this._update);
    this._setupPointerLock();
  }

  protected _removeEvents(): void {
    emitter.off(EngineEvents.LATE_UPDATE, this._update);
  }

  private _init(): void {
    // Get target's facing direction
    const targetDir = new Vector3(0, 0, 1);
    if (this._target.getWorldDirection) {
      this._target.getWorldDirection(targetDir);
    }

    // Initialize yaw from target's facing direction
    // Camera forward with YXZ rotation is (sin(yaw), 0, -cos(yaw))
    this._yaw = Math.atan2(targetDir.x, -targetDir.z);
    this._pitch = 0;

    this._euler.set(0, this._yaw, 0, "YXZ");
    this._targetQuat.setFromEuler(this._euler);

    // Initial camera position
    this._updatePosition();
    this._camera.quaternion.copy(this._targetQuat);
  }

  private _getCameraHeight(): number {
    // If explicit height is set, use it
    if (this._height > 0) {
      return this._height;
    }

    // Otherwise use target dimensions
    if (this._target.getDimensions) {
      return this._target.getDimensions().y;
    }

    return 10; // Default fallback
  }

  private _updatePosition(): void {
    const height = this._getCameraHeight();
    this._camera.position.set(
      this._target.position.x,
      this._target.position.y + height,
      this._target.position.z
    );
  }

  private _update = (_dt: number): void => {
    if (this._disposed || !this._active) return;

    // Update camera position to follow target
    this._updatePosition();

    // Apply rotation directly (no smoothing for FPS)
    this._camera.quaternion.copy(this._targetQuat);
  };

  private _handleResize = (): void => {
    this._rotationConversion = calculateRotationConversion();
  };
}
