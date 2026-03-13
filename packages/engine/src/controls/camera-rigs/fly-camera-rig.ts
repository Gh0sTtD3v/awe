import { Euler, Quaternion } from "three";
import emitter from "../../internal/engine-emitter";
import { EngineEvents, MouseEventData } from "../../internal/engine-events";
import {
  BaseCameraRig,
  BaseCameraRigConfig,
  IS_MOBILE,
  IS_TOUCH,
  applyAxisDampening,
  calculateRotationConversion,
  RotationConversion,
} from "./base-camera-rig";
import { IS_POINTER_LOCK } from "../../internal/constants";

/**
 * Fly camera rig configuration
 */
export interface FlyCameraRigConfig extends BaseCameraRigConfig {
  /** Movement speed in units per second (default: 10) */
  moveSpeed?: number;
  /** Rotation speed multiplier (default: 1.2) */
  rotateSpeed?: number;
  /** Rotation interpolation factor for slerp (default: 0.02) */
  lerp?: number;
  /** Invert Y axis (default: false) */
  invertY?: boolean;
}

/**
 * Fly camera movement actions
 */
export interface FlyCameraActions {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  panLeft: boolean;
  panRight: boolean;
}

/**
 * Fly camera rig state for save/restore
 */
export interface FlyCameraRigState {
  position: { x: number; y: number; z: number };
  targetQuaternion: { x: number; y: number; z: number; w: number };
  euler: { x: number; y: number; z: number };
}

/**
 * Fly camera rig for free-form camera movement.
 * Features quaternion-based rotation with slerp smoothing and WASD movement.
 *
 * @example
 * ```ts
 * const cameraRig = new FlyCameraRig({
 *   camera: Camera.current,
 *   moveSpeed: 10,
 *   rotateSpeed: 1.2,
 *   lerp: 0.02,
 * });
 *
 * // Update movement actions based on input
 * cameraRig.actions.forward = input.button("forward");
 * cameraRig.actions.up = input.button("up");
 * ```
 */
export class FlyCameraRig extends BaseCameraRig {
  private _moveSpeed: number;
  private _rotateSpeed: number;
  private _lerp: number;
  private _invertY: boolean;

  // Rotation state
  private _euler = new Euler(0, 0, 0, "YXZ");
  private _targetQuat: Quaternion | null = null;

  // Sensitivity conversion (screen-based like first-person)
  private _rotationConversion: RotationConversion;

  // Drag mode for non-pointer-lock control
  private _dragMode = false;
  private _isDragging = false;

  /**
   * Movement actions - set these based on input state.
   * - forward/backward: Move along camera's local Z axis
   * - left/right: Move along camera's local X axis
   * - up/down: Move in world Y direction
   */
  actions: FlyCameraActions = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    panLeft: false,
    panRight: false,
  };

  constructor(config: FlyCameraRigConfig) {
    super(config);

    this._moveSpeed = config.moveSpeed ?? 10;
    this._rotateSpeed = config.rotateSpeed ?? 1.2;
    this._lerp = config.lerp ?? 0.02;
    this._invertY = config.invertY ?? false;

    this._rotationConversion = calculateRotationConversion();

    // Initialize target quaternion from camera
    this._targetQuat = new Quaternion();
    this._targetQuat.copy(this._camera.quaternion);

    this._setupPointerLock();
    emitter.on(EngineEvents.RESIZE, this._handleResize);
    this.active = true;
  }

  /** Movement speed */
  get moveSpeed(): number {
    return this._moveSpeed;
  }

  set moveSpeed(value: number) {
    this._moveSpeed = value;
  }

  /** Rotation speed multiplier */
  get rotateSpeed(): number {
    return this._rotateSpeed;
  }

  set rotateSpeed(value: number) {
    this._rotateSpeed = value;
  }

  /** Rotation lerp factor */
  get lerp(): number {
    return this._lerp;
  }

  set lerp(value: number) {
    this._lerp = value;
  }

  /** Whether in drag mode (vs pointer lock) */
  get dragMode(): boolean {
    return this._dragMode;
  }

  set dragMode(value: boolean) {
    this._dragMode = value;
  }

  /**
   * Rotate the camera using screen-based sensitivity.
   */
  rotate(deltaX: number, deltaY: number): void {
    // Apply ratio-based axis dampening
    const { dx, dy } = applyAxisDampening(deltaX, deltaY);

    if (this._targetQuat == null) {
      this._targetQuat = new Quaternion();
      this._targetQuat.copy(this._camera.quaternion);
    }

    this._euler.setFromQuaternion(this._targetQuat);

    // Direction: -1 for pointer lock (inverted feel), 1 for drag mode
    const dir = this._dragMode ? 1 : -1;

    this._euler.y +=
      dir * dx * this._rotationConversion.dxToRad * this._rotateSpeed;

    const pitchSign = this._invertY ? -1 : 1;
    this._euler.x +=
      dir *
      pitchSign *
      dy *
      this._rotationConversion.dyToRad *
      this._rotateSpeed;

    // Clamp pitch
    this._euler.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, this._euler.x)
    );

    this._targetQuat.setFromEuler(this._euler);
  }

  /**
   * Set rotation directly in radians
   */
  setRotation(yaw: number, pitch: number): void {
    this._euler.set(pitch, yaw, 0, "YXZ");
    if (!this._targetQuat) {
      this._targetQuat = new Quaternion();
    }
    this._targetQuat.setFromEuler(this._euler);
  }

  /**
   * Set position directly
   */
  setPosition(x: number, y: number, z: number): void {
    this._camera.position.set(x, y, z);
  }

  /**
   * Reset actions to idle state
   */
  resetActions(): void {
    this.actions = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      panLeft: false,
      panRight: false,
    };
  }

  /** Save current state */
  saveState(): FlyCameraRigState {
    return {
      position: {
        x: this._camera.position.x,
        y: this._camera.position.y,
        z: this._camera.position.z,
      },
      targetQuaternion: this._targetQuat
        ? {
            x: this._targetQuat.x,
            y: this._targetQuat.y,
            z: this._targetQuat.z,
            w: this._targetQuat.w,
          }
        : { x: 0, y: 0, z: 0, w: 1 },
      euler: {
        x: this._euler.x,
        y: this._euler.y,
        z: this._euler.z,
      },
    };
  }

  /** Restore a previously saved state */
  loadState(state: FlyCameraRigState): void {
    this._camera.position.set(
      state.position.x,
      state.position.y,
      state.position.z
    );
    if (!this._targetQuat) {
      this._targetQuat = new Quaternion();
    }
    this._targetQuat.set(
      state.targetQuaternion.x,
      state.targetQuaternion.y,
      state.targetQuaternion.z,
      state.targetQuaternion.w
    );
    this._euler.set(state.euler.x, state.euler.y, state.euler.z, "YXZ");
  }

  /** Reset rotation and actions */
  reset(): void {
    this._euler.set(0, 0, 0, "YXZ");
    this._targetQuat = null;
    this.resetActions();
  }

  dispose(): void {
    if (this._disposed) return;
    emitter.off(EngineEvents.LATE_UPDATE, this._update);
    emitter.off(EngineEvents.RESIZE, this._handleResize);
    emitter.off(EngineEvents.MOUSE_DOWN, this._onMouseDown);
    emitter.off(EngineEvents.MOUSE_UP, this._onMouseUp);
    emitter.off(EngineEvents.MOUSE_MOVE, this._onMouseMoveFly);
    super.dispose();
  }

  protected _addEvents(): void {
    emitter.on(EngineEvents.LATE_UPDATE, this._update);
    emitter.on(EngineEvents.MOUSE_DOWN, this._onMouseDown);
    emitter.on(EngineEvents.MOUSE_UP, this._onMouseUp);
    emitter.on(EngineEvents.MOUSE_MOVE, this._onMouseMoveFly);
    this._setupPointerLock();
  }

  protected _removeEvents(): void {
    emitter.off(EngineEvents.LATE_UPDATE, this._update);
    emitter.off(EngineEvents.MOUSE_DOWN, this._onMouseDown);
    emitter.off(EngineEvents.MOUSE_UP, this._onMouseUp);
    emitter.off(EngineEvents.MOUSE_MOVE, this._onMouseMoveFly);
  }

  private _onMouseDown = (_event: any): void => {
    this._isDragging = true;
  };

  private _onMouseUp = (): void => {
    this._isDragging = false;
  };

  private _onMouseMoveFly = (event: MouseEventData): void => {
    if (!this._active) return;

    // Determine if we should process movement
    const enableMove =
      IS_TOUCH ||
      (this._dragMode && this._isDragging) ||
      (!this._dragMode && IS_POINTER_LOCK());

    if (!enableMove) return;

    let movementX = 0;
    let movementY = 0;

    for (let i = 0; i < event.mousemovePackets.length; i++) {
      movementX += event.mousemovePackets[i].raw.dx;
      movementY += event.mousemovePackets[i].raw.dy;
    }

    this.rotate(movementX, movementY);
  };

  private _update = (dt: number): void => {
    if (this._disposed || !this._active) return;

    // Apply rotation with slerp smoothing
    if (this._targetQuat) {
      if (IS_MOBILE) {
        // Mobile: faster response
        this._camera.quaternion.slerp(this._targetQuat, 0.1);
      } else {
        this._camera.quaternion.slerp(this._targetQuat, this._lerp);
      }
    }

    // Process movement
    const speed = this._moveSpeed * dt;

    // Up/down in world space
    if (this.actions.up) {
      this._camera.position.y += speed;
    }
    if (this.actions.down) {
      this._camera.position.y -= speed;
    }

    // Forward/backward in camera's local Z
    if (this.actions.forward) {
      this._camera.translateZ(-speed);
    }
    if (this.actions.backward) {
      this._camera.translateZ(speed);
    }

    // Left/right in camera's local X
    if (this.actions.left) {
      this._camera.translateX(-speed);
    }
    if (this.actions.right) {
      this._camera.translateX(speed);
    }
  };

  private _handleResize = (): void => {
    this._rotationConversion = calculateRotationConversion();
  };
}
