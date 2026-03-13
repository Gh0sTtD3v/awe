import { Camera, Object3D, Vector3, MathUtils } from "three";
import emitter from "../../internal/engine-emitter";
import { EngineEvents } from "../../internal/engine-events";

const _tempOffset = new Vector3();
const _tempPivot = new Vector3();
const UP = new Vector3(0, 1, 0);

/**
 * Follow camera rig configuration
 */
export interface FollowCameraRigConfig {
  /** The camera to control */
  camera: Camera;
  /** The target to follow */
  target: Object3D;
  /** Offset from target position (default: (0, 10, 0) for top-down view) */
  offset?: Vector3;
  /** Height offset from target (default: 0) */
  height?: number;
  /**
   * Whether offset rotates with target's Y rotation (default: false)
   * - false: world-fixed offset (top-down, isometric)
   * - true: offset rotates with target (behind-character follow)
   */
  rotateWithTarget?: boolean;
  /** Smoothing factor 0-1 for XZ position following (default: 0.1, 0 = instant) */
  smoothing?: number;
  /** Altitude-specific smoothing for Y axis (default: 0.17) */
  altitudeSmoothing?: number;
  /** Maximum altitude distance before smoothing accelerates (default: 25) */
  altitudeMaxDistance?: number;
  /** LookAt interpolation smoothing (default: 0.1) */
  lookAtSmoothing?: number;
}

/**
 * Follow camera rig state for save/restore
 */
export interface FollowCameraRigState {
  virtualTarget: { x: number; y: number; z: number };
  cameraHeight: number;
}

/**
 * Flexible follow camera rig that supports multiple use cases:
 * - Top-down: offset (0, 10, 0), rotateWithTarget: false
 * - Isometric: offset (10, 15, 10), rotateWithTarget: false
 * - Behind-character: offset (0, 2, -8), rotateWithTarget: true
 *
 * Works with both PerspectiveCamera and OrthographicCamera.
 * Camera height is computed dynamically from target dimensions + height offset.
 *
 * @example
 * ```ts
 * // Top-down view
 * const topDown = new FollowCameraRig({
 *   camera: Camera.current,
 *   target: avatar,
 *   offset: new Vector3(0, 20, 0),
 * });
 *
 * // Isometric view
 * const isometric = new FollowCameraRig({
 *   camera: Camera.current,
 *   target: avatar,
 *   offset: new Vector3(10, 15, 10),
 * });
 *
 * // Behind-character follow
 * const behindChar = new FollowCameraRig({
 *   camera: Camera.current,
 *   target: avatar,
 *   offset: new Vector3(0, 2, -8),
 *   height: 0.5, // Additional height offset
 *   rotateWithTarget: true,
 * });
 * ```
 */
export class FollowCameraRig {
  private _camera: Camera;
  private _target: Object3D & { getDimensions?: () => { y: number } };
  private _offset: Vector3;
  private _height: number;
  private _rotateWithTarget: boolean;
  private _smoothing: number;
  private _altitudeSmoothing: number;
  private _altitudeMaxDistance: number;
  private _lookAtSmoothing: number;

  private _active = false;
  private _disposed = false;
  private _virtualTarget = new Vector3();
  private _cameraHeight = 0;

  constructor(config: FollowCameraRigConfig) {
    this._camera = config.camera;
    this._target = config.target;
    this._offset = config.offset?.clone() ?? new Vector3(0, 10, 0);
    this._height = config.height ?? 0;
    this._rotateWithTarget = config.rotateWithTarget ?? false;
    this._smoothing = config.smoothing ?? 0.1;
    this._altitudeSmoothing = config.altitudeSmoothing ?? 0.17;
    this._altitudeMaxDistance = config.altitudeMaxDistance ?? 25;
    this._lookAtSmoothing = config.lookAtSmoothing ?? 0.1;

    this._init();
    this.active = true;
  }

  /** Whether the camera rig is active */
  get active(): boolean {
    return this._active;
  }

  set active(value: boolean) {
    if (this._active === value) return;
    this._active = value;

    if (value) {
      // Re-sync virtual target to current target position to avoid camera jump
      this._virtualTarget.copy(this._target.position);
      emitter.on(EngineEvents.LATE_UPDATE, this._update);
    } else {
      emitter.off(EngineEvents.LATE_UPDATE, this._update);
    }
  }

  /** Height offset from target */
  get height(): number {
    return this._height;
  }

  set height(value: number) {
    this._height = value;
  }

  /** Offset from target position */
  get offset(): Vector3 {
    return this._offset;
  }

  set offset(value: Vector3) {
    this._offset.copy(value);
  }

  /** Whether offset rotates with target */
  get rotateWithTarget(): boolean {
    return this._rotateWithTarget;
  }

  set rotateWithTarget(value: boolean) {
    this._rotateWithTarget = value;
  }

  /** Smoothing factor */
  get smoothing(): number {
    return this._smoothing;
  }

  set smoothing(value: number) {
    this._smoothing = value;
  }

  /** LookAt smoothing factor */
  get lookAtSmoothing(): number {
    return this._lookAtSmoothing;
  }

  set lookAtSmoothing(value: number) {
    this._lookAtSmoothing = value;
  }

  /** The forward direction (from camera toward target) */
  get forward(): Vector3 {
    return new Vector3()
      .subVectors(this._virtualTarget, this._camera.position)
      .normalize();
  }

  /** The right direction */
  get right(): Vector3 {
    const forward = this.forward;
    return new Vector3().crossVectors(UP, forward).normalize();
  }

  /** Rotate is a no-op for follow camera */
  rotate(_deltaX: number, _deltaY: number): void {
    // Follow camera doesn't rotate from input
  }

  /** Reset to initial state */
  reset(): void {
    this._init();
  }

  /** Save current state */
  saveState(): FollowCameraRigState {
    return {
      virtualTarget: {
        x: this._virtualTarget.x,
        y: this._virtualTarget.y,
        z: this._virtualTarget.z,
      },
      cameraHeight: this._cameraHeight,
    };
  }

  /** Restore a previously saved state */
  loadState(state: FollowCameraRigState): void {
    this._virtualTarget.set(
      state.virtualTarget.x,
      state.virtualTarget.y,
      state.virtualTarget.z
    );
    this._cameraHeight = state.cameraHeight;
  }

  /** Dispose the camera rig */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.active = false;
  }

  private _getTargetHeight(): number {
    if (!this._target.getDimensions) return 1;
    return this._target.getDimensions().y;
  }

  private _computeOffset(): Vector3 {
    if (this._rotateWithTarget) {
      // Rotate offset by target's Y rotation
      return _tempOffset.copy(this._offset).applyAxisAngle(UP, this._target.rotation.y);
    }
    return _tempOffset.copy(this._offset);
  }

  private _init(): void {
    this._cameraHeight = this._getTargetHeight() + this._height;
    this._virtualTarget.copy(this._target.position);

    const offset = this._computeOffset();

    // Camera position: virtualTarget + offset, with cameraHeight added to Y
    this._camera.position.set(
      this._virtualTarget.x + offset.x,
      this._virtualTarget.y + this._cameraHeight + offset.y,
      this._virtualTarget.z + offset.z
    );

    // Look at target at head height
    _tempPivot.set(
      this._virtualTarget.x,
      this._virtualTarget.y + this._cameraHeight - this._height,
      this._virtualTarget.z
    );
    this._camera.lookAt(_tempPivot);
  }

  private _update = (dt: number): void => {
    if (this._disposed || !this._active) return;

    this._cameraHeight = this._getTargetHeight() + this._height;

    // Smooth virtual target position with altitude-specific smoothing
    const targetAltitude = this._target.position.y;
    const altitudeSmoothing = this._altitudeSmoothing || 0.01;
    const maxDistance = this._altitudeMaxDistance;

    // Reduction factor accelerates smoothing when target is far from camera
    const altitudeDiff = Math.abs(this._virtualTarget.y - targetAltitude);
    const reduction = Math.min(1, altitudeDiff / maxDistance) ** 1.8;

    // Double-lerp for Y: base smoothing + reduction acceleration
    const baseYLerp = MathUtils.lerp(
      this._virtualTarget.y,
      targetAltitude,
      Math.min(1, dt / altitudeSmoothing)
    );
    this._virtualTarget.y = MathUtils.lerp(baseYLerp, targetAltitude, reduction);

    // X and Z can use the general smoothing factor
    if (this._smoothing > 0) {
      const baseLerp = 1.0 - Math.pow(0.001, dt);
      const lerpAlpha = 1 - this._smoothing * (1 - baseLerp);
      this._virtualTarget.x = MathUtils.lerp(
        this._virtualTarget.x,
        this._target.position.x,
        lerpAlpha
      );
      this._virtualTarget.z = MathUtils.lerp(
        this._virtualTarget.z,
        this._target.position.z,
        lerpAlpha
      );
    } else {
      this._virtualTarget.x = this._target.position.x;
      this._virtualTarget.z = this._target.position.z;
    }

    // Compute final offset (rotated if needed)
    const offset = this._computeOffset();

    // Position camera: virtualTarget + offset, with cameraHeight added to Y
    this._camera.position.set(
      this._virtualTarget.x + offset.x,
      this._virtualTarget.y + this._cameraHeight + offset.y,
      this._virtualTarget.z + offset.z
    );

    // Look at target at head height (cameraHeight - height = target height)
    _tempPivot.set(
      this._virtualTarget.x,
      this._virtualTarget.y + this._cameraHeight - this._height,
      this._virtualTarget.z
    );
    this._camera.lookAt(_tempPivot);
  };
}
