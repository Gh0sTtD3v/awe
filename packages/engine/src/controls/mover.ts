import { Vector3, Quaternion, Object3D } from "three";
import type { Component3D } from "../space/abstract/component-3d";
import type { CharacterController, CharacterControllerOpts } from "../physics/types";
import type { XYZ, XYZW } from "../@types/types";
import { DEFAULT_CHARACTER_CONTROLLER_OPTIONS } from "../physics/types";

const DIRECTION = {
  UP: new Vector3(0, 1, 0),
  FORWARD: new Vector3(0, 0, -1),
  RIGHT: new Vector3(1, 0, 0),
};

function mix(min: number, max: number, value: number) {
  return min * (1 - value) + max * value;
}

function smoothstep(min: number, max: number, value: number) {
  if (min === max) {
    return value <= min ? 0 : 1;
  }
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Jump configuration for physics-based projectile motion
 */
export interface JumpConfig {
  /** Jump peak height in units (default: 5) */
  height?: number;
  /** Time to reach peak in seconds (default: 0.5) */
  duration?: number;
  /** Whether holding jump extends height (default: false) */
  hold?: boolean;
  /** Delay between consecutive jumps in seconds (default: 0) */
  delay?: number;
  /** Speed multiplier at jump apex (default: 1) */
  peakSpeed?: number;
  /** Maximum number of jumps (default: 2) */
  maxJumps?: number;
  /** Coyote time in seconds (grace period for jumping after leaving ground) (default: Infinity) */
  coyoteTime?: number;
  /** Maximum fall speed in units per second (default: 20) */
  maxFallSpeed?: number;
}

/**
 * Movement configuration
 */
export interface MovementConfig {
  /** Ground movement speed in units per second (default: 15) */
  speed?: number;
  /** Acceleration in units/s² (0 = instant, higher = faster) (default: 100) */
  acceleration?: number;
  /** Deceleration in units/s² (0 = instant, higher = faster) (default: 50) */
  deceleration?: number;
  /** Air control factor (0 = none, 1 = full ground control) (default: 1) */
  airControl?: number;
  /** Gravity in units per second squared (negative = down) (default: -1.81) */
  gravity?: number;
  /** Whether to automatically rotate to face movement direction (default: true) */
  autoRotate?: boolean;
}

/**
 * Options for the move() method
 */
export interface MoveOptions {
  /** Custom forward direction. If provided with `right`, bypasses target-relative movement */
  forward?: Vector3;
  /** Custom right direction. Must be provided with `forward` */
  right?: Vector3;
  /** Speed override */
  speed?: number;
}

/**
 * Mover state for save/restore
 */
export interface MoverState {
  position: XYZ;
  quaternion: XYZW;
  velocity: XYZ;
  direction: XYZ;
  prevDirection: XYZ;
  currentSpeed: number;
  grounded: boolean;
  wasGrounded: boolean;
  wasMoving: boolean;
  coyoteTimeLeft: number;
  targetRotation: number;
  currentQuaternion: XYZW;
  targetQuaternion: XYZW;
  horizontalImpulse: { x: number; z: number };
  verticalImpulse: number;
  impulseDecayFrames: number;
  jump: {
    count: number;
    isJumping: boolean;
    reachedPeak: boolean;
    elapsedTime: number;
    jumpGravity: number;
    jumpVelocity: number;
    currentHeight: number;
    maxHeight: number;
    delay: number;
    prevJumpKeyState: boolean;
  };
}

/**
 * Mover configuration
 */
export interface MoverConfig {
  /** The body/component to move */
  body: Component3D;

  /** Reference object for direction (typically camera) */
  target?: Object3D;

  /** Movement configuration */
  movement?: MovementConfig;

  /** Physics-based jump configuration */
  jump?: JumpConfig;

  /** Character controller options */
  characterOptions?: Partial<CharacterControllerOpts>;

  /** Track boundary constraints for lateral movement */
  track?: {
    minX?: number;
    maxX?: number;
  };

}

export interface MoverEvents {
  grounded: () => void;
  airborne: () => void;
  wallHit: (normal: Vector3) => void;
  jumped: (jumpCount: number) => void;
  movementStart: () => void;
  movementStop: () => void;
}

/**
 * Mover primitive - applies velocity to a body.
 * Handles ground detection, gravity, collision response.
 *
 * @example
 * ```ts
 * const mover = new Mover({
 *   body: avatar,
 *   gravity: -30,
 *   speed: 12,
 *   acceleration: 0.1,
 *   airControl: 0.3,
 * });
 *
 * // In update loop
 * mover.move(input.axis("moveX"), input.axis("moveY"));
 * ```
 */
// Conversion factor from scene units to jump units (matches PlatformerControls)
const SCENE_JUMP_UNIT = 0.04;
const RESTORE_POSITION = new Vector3();
const RESTORE_QUATERNION = new Quaternion();

export class Mover {
  private _body: Component3D;
  private _target: Object3D | { position: Vector3; quaternion: Quaternion };
  private _characterController: CharacterController;
  private _disposed = false;

  // Configuration
  private _gravity: number;
  private _baseSpeed: number;
  private _acceleration: number;
  private _deceleration: number;
  private _airControl: number;
  private _maxFallSpeed: number;
  private _autoRotate: boolean;
  private _coyoteTimeDuration: number;
  private _track: { minX: number; maxX: number };

  // Jump configuration
  private _jumpConfig: Required<JumpConfig>;

  // Internal state
  private _velocity = new Vector3();
  private _direction = new Vector3();
  private _prevDirection = new Vector3();
  private _targetQuaternion = new Quaternion();
  private _currentQuaternion = new Quaternion();
  private _targetRotation = 0;
  private _currentSpeed = 0;
  private _coyoteTimeLeft = 0;
  private _grounded = false;
  private _wasGrounded = false;
  private _isMoving = false;
  private _wasMoving = false;
  private _wallContact: { normal: Vector3 } | null = null;
  private _collidesWith: any[] = [];

  // Jump state (physics-based projectile motion)
  private _jumpState = {
    count: 0,
    isJumping: false,
    reachedPeak: false,
    elapsedTime: 0,
    jumpGravity: 0,
    jumpVelocity: 0,
    currentHeight: 0,
    maxHeight: 0,
    delay: 0,
    prevJumpKeyState: false,
  };

  // Track last delta time for justJumped detection
  private _lastDt = 0;

  // Flag to sync grounded state without applying gravity on first update
  private _needsGroundSync = false;

  // Impulse state (for external forces like knockback)
  private _horizontalImpulse = { x: 0, z: 0 };
  private _verticalImpulse = 0;
  private _impulseDecayFrames = 5;

  // Event listeners
  private _listeners: { [K in keyof MoverEvents]?: MoverEvents[K][] } = {};

  constructor(config: MoverConfig) {
    this._body = config.body;
    this._target = config.target || {
      position: new Vector3(0, 0, 0),
      quaternion: new Quaternion(),
    };

    const movement = config.movement ?? {};
    const jump = config.jump ?? {};

    // Movement configuration with defaults
    this._gravity = movement.gravity ?? -1.81;
    this._baseSpeed = movement.speed ?? 15;
    this._acceleration = movement.acceleration ?? 100;
    this._deceleration = movement.deceleration ?? 50;
    this._airControl = movement.airControl ?? 1;
    this._autoRotate = movement.autoRotate ?? true;

    // Jump configuration with defaults
    this._maxFallSpeed = jump.maxFallSpeed ?? 20;
    this._coyoteTimeDuration = jump.coyoteTime ?? Infinity;
    this._jumpConfig = {
      height: jump.height ?? 5,
      duration: jump.duration ?? 1,
      hold: jump.hold ?? false,
      delay: jump.delay ?? 0,
      peakSpeed: jump.peakSpeed ?? 1,
      maxJumps: jump.maxJumps ?? 2,
      coyoteTime: jump.coyoteTime ?? Infinity,
      maxFallSpeed: jump.maxFallSpeed ?? 20,
    };

    // Track constraints
    this._track = {
      minX: config.track?.minX ?? -Infinity,
      maxX: config.track?.maxX ?? Infinity,
    };

    // Initialize character controller
    this._characterController = this._body.space.physics.createCharacterController(
      config.characterOptions || DEFAULT_CHARACTER_CONTROLLER_OPTIONS
    );

    // Initialize rotation from current body orientation
    this._body.getWorldDirection(this._direction);
    this._targetRotation = Math.atan2(this._direction.x, this._direction.z);
    this._currentQuaternion.copy(this._body.quaternion);
  }

  // Public getters

  /** Whether the mover is on the ground */
  get grounded(): boolean {
    return this._grounded;
  }

  /** Current velocity */
  get velocity(): Vector3 {
    return this._velocity.clone();
  }

  /** Current horizontal speed */
  get speed(): number {
    return this._currentSpeed;
  }

  /** Whether currently moving */
  get isMoving(): boolean {
    return this._isMoving;
  }

  /** Wall contact information, if any */
  get wallContact(): { normal: Vector3 } | null {
    return this._wallContact;
  }

  /** Coyote time remaining */
  get coyoteTimeRemaining(): number {
    return this._coyoteTimeLeft;
  }

  /** Whether in coyote time (can still jump after leaving ground) */
  get inCoyoteTime(): boolean {
    return this._coyoteTimeLeft > 0;
  }

  /** The body being controlled */
  get body(): Component3D {
    return this._body;
  }

  /** Base movement speed */
  get baseSpeed(): number {
    return this._baseSpeed;
  }

  set baseSpeed(value: number) {
    this._baseSpeed = value;
  }

  /** Gravity value */
  get gravity(): number {
    return this._gravity;
  }

  set gravity(value: number) {
    this._gravity = value;
  }

  /** Auto-rotate setting */
  get autoRotate(): boolean {
    return this._autoRotate;
  }

  set autoRotate(value: boolean) {
    this._autoRotate = value;
  }

  /** Whether the mover is currently in a jump */
  get isJumping(): boolean {
    return this._jumpState.isJumping;
  }

  /** Whether the jump has reached its peak */
  get reachedPeak(): boolean {
    return this._jumpState.reachedPeak;
  }

  /** Number of jumps performed since last grounded */
  get jumpCount(): number {
    return this._jumpState.count;
  }

  /** Whether the mover just jumped this frame */
  get justJumped(): boolean {
    // Check if we're jumping and elapsedTime is within one frame's dt
    // This allows the flag to be read after mover.update() has already incremented elapsedTime
    return (
      this._jumpState.isJumping && this._jumpState.elapsedTime <= this._lastDt
    );
  }

  /** Jump configuration */
  get jumpConfig(): Required<JumpConfig> {
    return this._jumpConfig;
  }

  /** Update jump configuration */
  setJumpConfig(config: Partial<JumpConfig>): void {
    if (config.height !== undefined) this._jumpConfig.height = config.height;
    if (config.duration !== undefined)
      this._jumpConfig.duration = config.duration;
    if (config.hold !== undefined) this._jumpConfig.hold = config.hold;
    if (config.delay !== undefined) this._jumpConfig.delay = config.delay;
    if (config.peakSpeed !== undefined)
      this._jumpConfig.peakSpeed = config.peakSpeed;
    if (config.maxJumps !== undefined)
      this._jumpConfig.maxJumps = config.maxJumps;
  }

  /**
   * Move the body based on input axes.
   *
   * By default, movement is relative to the configured target (typically camera).
   * For explicit direction control (e.g., FPS), pass `forward` and `right` vectors in options.
   *
   * @param moveX - Horizontal input (-1 to 1)
   * @param moveY - Forward/backward input (-1 to 1)
   * @param options - Movement options or speed override (number for backward compatibility)
   *
   * @example
   * ```ts
   * // Target-relative movement (platformer, top-down)
   * mover.move(input.axis("moveX"), input.axis("moveY"));
   *
   * // Explicit direction (FPS)
   * mover.move(moveX, moveY, { forward: camera.forward, right: camera.right });
   *
   * // With speed override
   * mover.move(moveX, moveY, { speed: sprintSpeed });
   * mover.move(moveX, moveY, sprintSpeed); // backward compatible
   * ```
   */
  move(moveX: number, moveY: number, options?: MoveOptions | number): void {
    // This just sets the intent; actual movement happens in update()
    const opts = typeof options === "number" ? { speed: options } : options;

    this._direction.set(0, 0, 0);

    if (opts?.forward && opts?.right) {
      // Explicit direction mode (for FPS-style controls)
      if (moveY !== 0) {
        const fwd = opts.forward
          .clone()
          .setY(0)
          .normalize()
          .multiplyScalar(moveY);
        this._direction.add(fwd);
      }
      if (moveX !== 0) {
        const rgt = opts.right
          .clone()
          .setY(0)
          .normalize()
          .multiplyScalar(moveX);
        this._direction.add(rgt);
      }
    } else {
      // Target-relative mode (for platformer, top-down, etc.)
      this._direction
        .addScaledVector(DIRECTION.FORWARD, moveY)
        .addScaledVector(DIRECTION.RIGHT, moveX);

      // Preserve analog magnitude for partial stick input while clamping
      // diagonals back to unit length when the combined input exceeds 1.
      if (this._direction.lengthSq() > 1) {
        this._direction.normalize();
      }

      // Align to target (camera) direction
      const angle = Math.atan2(
        2 *
          (this._target.quaternion.w * this._target.quaternion.y +
            this._target.quaternion.x * this._target.quaternion.z),
        1 -
          2 * (this._target.quaternion.y ** 2 + this._target.quaternion.x ** 2)
      );
      this._direction.applyAxisAngle(DIRECTION.UP, angle);
    }

    this._direction.normalize();
    this._isMoving = this._direction.length() > 0;

    if (opts?.speed !== undefined) {
      this._baseSpeed = opts.speed;
    }
  }

  /**
   * Apply an impulse with configurable behavior for horizontal and vertical components.
   * @param impulse - The impulse vector to apply
   * @param options - Configuration for impulse behavior
   */
  applyImpulse(
    impulse: Vector3,
    options?: {
      /** Number of frames to decay horizontal impulse (default: 5) */
      horizontalDecay?: number;
      /** Apply vertical component immediately (default: true) */
      verticalImmediate?: boolean;
    }
  ): void {
    const opts = {
      horizontalDecay: options?.horizontalDecay ?? 5,
      verticalImmediate: options?.verticalImmediate ?? true,
    };

    // Handle horizontal impulse with decay
    this._horizontalImpulse.x += impulse.x;
    this._horizontalImpulse.z += impulse.z;
    this._impulseDecayFrames = opts.horizontalDecay;

    // Handle vertical impulse
    if (opts.verticalImmediate) {
      this._velocity.y += impulse.y;
    } else {
      this._verticalImpulse += impulse.y;
    }
  }

  /**
   * Start a physics-based jump using projectile motion.
   * Uses configured jump height and duration to calculate gravity and velocity.
   * @returns true if jump was initiated, false if conditions not met
   */
  startJump(): boolean {
    const config = this._jumpConfig;

    // Check if we can jump
    const canCoyoteJump = this._grounded || this._coyoteTimeLeft > 0;
    const canMultiJump =
      !this._grounded && this._jumpState.count < config.maxJumps;
    const noDelay = this._jumpState.delay <= 0;

    if (!((canCoyoteJump && noDelay) || canMultiJump)) {
      return false;
    }

    // Initiate jump with projectile motion physics
    this._jumpState.isJumping = true;
    this._jumpState.count++;
    this._jumpState.delay = config.delay;
    this._jumpState.elapsedTime = 0;
    this._jumpState.reachedPeak = false;

    // Calculate jump physics (same formula as PlatformerControls)
    this._jumpState.maxHeight = config.height * SCENE_JUMP_UNIT;
    const jumpDuration = config.duration / 2; // Time to peak

    // Calculate gravity and initial velocity for desired arc
    this._jumpState.jumpGravity =
      this._jumpState.maxHeight / Math.pow(jumpDuration, 2);
    this._jumpState.jumpVelocity = this._jumpState.maxHeight / jumpDuration;

    // Clear coyote time
    this._coyoteTimeLeft = 0;

    // Emit jump event
    this._emit("jumped", this._jumpState.count);

    return true;
  }

  /**
   * Release jump (for hold-to-jump-higher mechanic).
   * If hold is enabled and currently jumping up, increases gravity to cut jump short.
   */
  releaseJump(): void {
    if (!this._jumpConfig.hold) return;
    if (!this._jumpState.isJumping) return;
    if (this._velocity.y <= 0) return;

    // Increase gravity to cut the jump short (same logic as PlatformerControls)
    const fallMultiplier = 3;
    const newCurrentHeight =
      this._jumpState.jumpVelocity * this._jumpState.elapsedTime -
      0.5 *
        (this._jumpState.jumpGravity * fallMultiplier) *
        Math.pow(this._jumpState.elapsedTime, 2);

    if (newCurrentHeight > 0) {
      this._jumpState.jumpGravity *= fallMultiplier;
    }
  }

  /**
   * Track jump key state for edge detection.
   * Call this each frame with the current jump button state.
   * @param pressed - Whether jump button is currently pressed
   * @returns true if jump was just pressed (rising edge)
   */
  updateJumpInput(pressed: boolean): boolean {
    const justPressed = pressed && !this._jumpState.prevJumpKeyState;
    this._jumpState.prevJumpKeyState = pressed;
    return justPressed;
  }

  /**
   * Override the current velocity.
   */
  setVelocity(velocity: Vector3): void {
    this._velocity.copy(velocity);
  }

  /**
   * Teleport to a position without physics.
   */
  teleport(position: Vector3, quaternion?: Quaternion): void {
    this._body.rigidBody?.teleport(
      position,
      quaternion || this._body.quaternion
    );
    this._velocity.set(0, 0, 0);
  }

  /**
   * Save the current mover state for later restoration.
   * Useful for checkpoints, respawning, etc.
   */
  saveState(): MoverState {
    return {
      position: {
        x: this._body.position.x,
        y: this._body.position.y,
        z: this._body.position.z,
      },
      quaternion: {
        x: this._body.quaternion.x,
        y: this._body.quaternion.y,
        z: this._body.quaternion.z,
        w: this._body.quaternion.w,
      },
      velocity: {
        x: this._velocity.x,
        y: this._velocity.y,
        z: this._velocity.z,
      },
      direction: {
        x: this._direction.x,
        y: this._direction.y,
        z: this._direction.z,
      },
      prevDirection: {
        x: this._prevDirection.x,
        y: this._prevDirection.y,
        z: this._prevDirection.z,
      },
      currentSpeed: this._currentSpeed,
      grounded: this._grounded,
      wasGrounded: this._wasGrounded,
      wasMoving: this._wasMoving,
      coyoteTimeLeft: this._coyoteTimeLeft,
      targetRotation: this._targetRotation,
      currentQuaternion: {
        x: this._currentQuaternion.x,
        y: this._currentQuaternion.y,
        z: this._currentQuaternion.z,
        w: this._currentQuaternion.w,
      },
      targetQuaternion: {
        x: this._targetQuaternion.x,
        y: this._targetQuaternion.y,
        z: this._targetQuaternion.z,
        w: this._targetQuaternion.w,
      },
      horizontalImpulse: { ...this._horizontalImpulse },
      verticalImpulse: this._verticalImpulse,
      impulseDecayFrames: this._impulseDecayFrames,
      jump: {
        count: this._jumpState.count,
        isJumping: this._jumpState.isJumping,
        reachedPeak: this._jumpState.reachedPeak,
        elapsedTime: this._jumpState.elapsedTime,
        jumpGravity: this._jumpState.jumpGravity,
        jumpVelocity: this._jumpState.jumpVelocity,
        currentHeight: this._jumpState.currentHeight,
        maxHeight: this._jumpState.maxHeight,
        delay: this._jumpState.delay,
        prevJumpKeyState: this._jumpState.prevJumpKeyState,
      },
    };
  }

  /**
   * Restore a previously saved mover state.
   */
  restoreState(state: MoverState): void {
    const position = RESTORE_POSITION.set(
      state.position.x,
      state.position.y,
      state.position.z,
    );
    const quaternion = RESTORE_QUATERNION.set(
      state.quaternion.x,
      state.quaternion.y,
      state.quaternion.z,
      state.quaternion.w,
    );

    if (this._body.rigidBody) {
      this._body.rigidBody.teleport(position, quaternion);
    } else {
      this._body.position.copy(position);
      this._body.quaternion.copy(quaternion);
      this._body.updateMatrixWorld?.(true);
    }

    this._velocity.set(state.velocity.x, state.velocity.y, state.velocity.z);
    this._direction.set(
      state.direction.x,
      state.direction.y,
      state.direction.z
    );
    this._prevDirection.set(
      state.prevDirection.x,
      state.prevDirection.y,
      state.prevDirection.z
    );
    this._currentSpeed = state.currentSpeed;
    this._grounded = state.grounded;
    this._wasGrounded = state.wasGrounded;
    this._wasMoving = state.wasMoving;
    this._coyoteTimeLeft = state.coyoteTimeLeft;
    this._targetRotation = state.targetRotation;
    this._currentQuaternion.set(
      state.currentQuaternion.x,
      state.currentQuaternion.y,
      state.currentQuaternion.z,
      state.currentQuaternion.w
    );
    this._targetQuaternion.set(
      state.targetQuaternion.x,
      state.targetQuaternion.y,
      state.targetQuaternion.z,
      state.targetQuaternion.w
    );
    this._horizontalImpulse = { ...state.horizontalImpulse };
    this._verticalImpulse = state.verticalImpulse;
    this._impulseDecayFrames = state.impulseDecayFrames;
    this._jumpState.count = state.jump.count;
    this._jumpState.isJumping = state.jump.isJumping;
    this._jumpState.reachedPeak = state.jump.reachedPeak;
    this._jumpState.elapsedTime = state.jump.elapsedTime;
    this._jumpState.jumpGravity = state.jump.jumpGravity;
    this._jumpState.jumpVelocity = state.jump.jumpVelocity;
    this._jumpState.currentHeight = state.jump.currentHeight;
    this._jumpState.maxHeight = state.jump.maxHeight;
    this._jumpState.delay = state.jump.delay;
    this._jumpState.prevJumpKeyState = state.jump.prevJumpKeyState;
    this._wallContact = null;
    this._collidesWith = [];
    this._needsGroundSync = false;
  }

  /**
   * Reset mover state (clear velocity, jump state, etc.)
   */
  reset(): void {
    this._velocity.set(0, 0, 0);
    this._grounded = false;
    this._collidesWith = [];
    this._jumpState.count = 0;
    this._jumpState.isJumping = false;
    this._jumpState.reachedPeak = false;
    this._jumpState.elapsedTime = 0;
    this._jumpState.delay = 0;
    this._horizontalImpulse = { x: 0, z: 0 };
    this._verticalImpulse = 0;
    this._isMoving = false;
    this._wasMoving = false;
    // Skip gravity on next update to establish grounded state first
    this._needsGroundSync = true;
  }

  /**
   * Update the mover. Call once per physics frame (FIXED_UPDATE).
   */
  update(dt: number): void {
    if (this._disposed) return;

    // Store dt for justJumped detection (must be before _applyJump)
    this._lastDt = dt;

    // On first update after reset, just sync grounded state without applying gravity
    if (this._needsGroundSync) {
      this._needsGroundSync = false;
      const probeDt = dt > 0 ? dt : 1 / 60;
      const originalPosition = RESTORE_POSITION.copy(this._body.position);
      const originalQuaternion = RESTORE_QUATERNION.copy(this._body.quaternion);
      // Rapier only reports grounded state after a downward probe.
      this._velocity.set(0, this._gravity * probeDt * 4, 0);
      this._applyPhysics(probeDt);
      if (this._body.rigidBody) {
        this._body.rigidBody.teleport(originalPosition, originalQuaternion);
      } else {
        this._body.position.copy(originalPosition);
        this._body.quaternion.copy(originalQuaternion);
        this._body.updateMatrixWorld?.(true);
      }
      this._velocity.set(0, 0, 0);
      this._checkStateTransitions();
      return;
    }

    // Apply gravity (or jump physics if jumping)
    this._applyGravity(dt);

    // Apply jump physics if using physics-based jump
    this._applyJump(dt);

    // Apply horizontal movement
    this._applyMovement(dt);

    // Apply external impulses
    this._applyImpulseDecay(dt);

    // Apply rotation
    if (this._autoRotate) {
      this._applyRotation(dt);
    }

    // Apply physics (character controller)
    this._applyPhysics(dt);

    // Update coyote time
    this._updateCoyoteTime(dt);

    // Update jump delay
    this._updateJumpDelay(dt);

    // Check for state transitions and emit events
    this._checkStateTransitions();
  }

  /**
   * Register an event listener.
   */
  on<K extends keyof MoverEvents>(event: K, callback: MoverEvents[K]): void {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event]!.push(callback);
  }

  /**
   * Remove an event listener.
   */
  off<K extends keyof MoverEvents>(event: K, callback: MoverEvents[K]): void {
    const listeners = this._listeners[event];
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Dispose the mover.
   */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._listeners = {};
  }

  // Private methods

  private _emit<K extends keyof MoverEvents>(
    event: K,
    ...args: Parameters<MoverEvents[K]>
  ): void {
    const listeners = this._listeners[event];
    if (listeners) {
      for (const listener of listeners) {
        (listener as Function)(...args);
      }
    }
  }

  private _applyGravity(dt: number): void {
    // Don't apply gravity while physics-based jump is active
    if (this._jumpState.isJumping) {
      return;
    }

    if (!this._grounded) {
      this._velocity.y += this._gravity * dt;

      // Clamp to max fall speed
      if (this._velocity.y < -this._maxFallSpeed) {
        this._velocity.y = -this._maxFallSpeed;
      }
    } else {
      // Small downward velocity to keep grounded
      // But don't override positive velocity (e.g., jump impulse)
      if (this._velocity.y <= 0) {
        this._velocity.y = this._gravity * dt * 4;
      }
    }
  }

  private _applyJump(dt: number): void {
    if (!this._jumpState.isJumping) return;

    this._jumpState.elapsedTime += dt;

    // Projectile motion calculation
    this._jumpState.currentHeight =
      this._jumpState.jumpVelocity * this._jumpState.elapsedTime -
      0.5 *
        this._jumpState.jumpGravity *
        Math.pow(this._jumpState.elapsedTime, 2);

    // Check if we've reached the peak (past 90% of max height)
    this._jumpState.reachedPeak =
      this._jumpState.currentHeight > (this._jumpState.maxHeight / 2) * 0.9;

    if (this._jumpState.currentHeight >= 0) {
      // Still in upward or peak phase - calculate velocity from height
      this._velocity.y =
        (this._jumpState.currentHeight +
          0.5 *
            -this._jumpState.jumpGravity *
            Math.pow(this._jumpState.elapsedTime, 2)) /
        this._jumpState.elapsedTime;
    } else {
      // Jump arc complete, return to normal gravity
      this._jumpState.isJumping = false;
      this._jumpState.elapsedTime = 0;
      this._jumpState.maxHeight = 0;
    }

    // Apply max fall speed limit
    if (this._velocity.y < -this._maxFallSpeed) {
      this._velocity.y = -this._maxFallSpeed;
    }
  }

  private _applyImpulseDecay(dt: number): void {
    // Apply and decay horizontal impulse
    if (
      Math.abs(this._horizontalImpulse.x) > 0.001 ||
      Math.abs(this._horizontalImpulse.z) > 0.001
    ) {
      const decayRate =
        this._impulseDecayFrames > 0 ? 1 / this._impulseDecayFrames : 1;
      const impulseThisFrame = {
        x: this._horizontalImpulse.x * decayRate * dt * 60,
        z: this._horizontalImpulse.z * decayRate * dt * 60,
      };

      this._velocity.x += impulseThisFrame.x;
      this._velocity.z += impulseThisFrame.z;

      this._horizontalImpulse.x -= impulseThisFrame.x;
      this._horizontalImpulse.z -= impulseThisFrame.z;
    } else {
      this._horizontalImpulse.x = 0;
      this._horizontalImpulse.z = 0;
    }

    // Apply vertical impulse immediately
    if (this._verticalImpulse !== 0) {
      this._velocity.y += this._verticalImpulse;
      this._verticalImpulse = 0;
    }
  }

  private _updateJumpDelay(dt: number): void {
    if (this._grounded && this._jumpState.delay > 0) {
      this._jumpState.delay -= dt;
    }
  }

  private _applyMovement(dt: number): void {
    const airMultiplier = this._grounded ? 1 : this._airControl;
    // Apply peak speed modifier if at jump apex
    const peakMultiplier = this._jumpState.reachedPeak
      ? this._jumpConfig.peakSpeed
      : 1;
    const targetSpeed = this._baseSpeed * airMultiplier * peakMultiplier;

    if (this._isMoving) {
      // Accelerate (higher value = faster, 0 = instant)
      if (this._acceleration === 0) {
        this._currentSpeed = targetSpeed;
      } else {
        const accel = this._acceleration * dt;
        this._currentSpeed = Math.min(this._currentSpeed + accel, targetSpeed);
      }

      this._prevDirection.copy(this._direction);
    } else {
      // Decelerate (higher value = faster, 0 = instant)
      if (this._deceleration === 0) {
        this._currentSpeed = 0;
      } else {
        const decel = this._deceleration * dt;
        this._currentSpeed = Math.max(this._currentSpeed - decel, 0);
      }
    }

    const direction =
      this._currentSpeed > 0 && !this._isMoving
        ? this._prevDirection
        : this._direction;

    this._velocity.x = direction.x * dt * this._currentSpeed;
    this._velocity.z = direction.z * dt * this._currentSpeed;
  }

  private _applyRotation(dt: number): void {
    if (!this._isMoving) return;

    this._targetRotation =
      Math.atan2(this._direction.x, this._direction.z) +
      (this._body.componentType === "model" ? 0 : Math.PI);

    this._targetQuaternion.setFromAxisAngle(DIRECTION.UP, this._targetRotation);

    const angleDifference = this._currentQuaternion.angleTo(
      this._targetQuaternion
    );

    if (angleDifference !== 0) {
      const force = mix(10, 20, smoothstep(0, Math.PI, angleDifference));
      this._currentQuaternion.rotateTowards(
        this._targetQuaternion,
        Math.min(dt * force, 1.0)
      );
    }

    this._body.quaternion.copy(this._currentQuaternion);
  }

  private _applyPhysics(dt: number): void {
    const state = this._characterController.update(
      this._body,
      this._velocity,
      dt
    );

    this._grounded = state.onFloor;
    this._collidesWith = state.collidesWith;

    // Check for wall contacts
    this._wallContact = null;
    for (const collision of this._collidesWith) {
      if (collision.normal1) {
        const normal = new Vector3(
          collision.normal1.x,
          collision.normal1.y,
          collision.normal1.z
        );
        // Wall = mostly horizontal normal
        if (Math.abs(normal.y) < 0.3) {
          this._wallContact = { normal };
          this._emit("wallHit", normal);
          break;
        }
      }
    }

    // Apply track constraints
    if (this._track.minX !== -Infinity || this._track.maxX !== Infinity) {
      const pos = this._body.position;
      pos.x = Math.max(this._track.minX, Math.min(this._track.maxX, pos.x));
    }
  }

  private _updateCoyoteTime(dt: number): void {
    if (this._grounded) {
      this._coyoteTimeLeft = this._coyoteTimeDuration;
    } else if (this._coyoteTimeDuration !== Infinity) {
      // Only decrement if coyote time is not infinite (matches PlatformerControls)
      this._coyoteTimeLeft = Math.max(0, this._coyoteTimeLeft - dt);
    }
  }

  private _checkStateTransitions(): void {
    // Emit grounded/airborne events and reset jump state
    if (this._grounded && !this._wasGrounded) {
      this._jumpState.count = 0;
      this._jumpState.isJumping = false;
      this._jumpState.reachedPeak = false;
      this._emit("grounded");
    } else if (!this._grounded && this._wasGrounded) {
      this._emit("airborne");
    }

    this._wasGrounded = this._grounded;

    // Emit movement start/stop events
    if (this._isMoving && !this._wasMoving) {
      this._emit("movementStart");
    } else if (!this._isMoving && this._wasMoving) {
      this._emit("movementStop");
    }

    this._wasMoving = this._isMoving;
  }
}
