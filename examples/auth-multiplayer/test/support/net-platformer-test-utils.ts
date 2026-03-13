import { Quaternion, Vector3 } from "three";
import type { MoverState } from "@oncyberio/engine/controls";
import {
  createEmptyNetPlatformerCommandFrame,
  type CommandSource,
  type NetPlatformerCommandFrame,
  type NetPlatformerSimState,
} from "../../shared/net-platformer";

export class FakeNetPlatformerMover {
  body = {
    position: new Vector3(),
    quaternion: new Quaternion(),
    componentType: "object" as const,
  };

  grounded = true;
  isMoving = false;
  speed = 0;
  jumpCount = 0;
  isJumping = false;
  reachedPeak = false;
  coyoteTimeRemaining = 0;

  private _velocity = new Vector3();
  private _direction = new Vector3();
  private _baseSpeed = 0;
  private _releaseMultiplier = 1;
  private _airborneTicks = 0;

  get velocity(): Vector3 {
    return this._velocity.clone();
  }

  get speedCategory(): "idle" | "walking" | "running" | "sprinting" {
    if (this.speed < 0.5) return "idle";
    if (this.speed < 4) return "walking";
    if (this.speed < 7) return "running";
    return "sprinting";
  }

  move(
    moveX: number,
    moveY: number,
    options?: {
      forward?: Vector3;
      right?: Vector3;
      speed?: number;
    },
  ): void {
    const direction = new Vector3();

    if (options?.forward) {
      direction.add(options.forward.clone().multiplyScalar(moveY));
    }

    if (options?.right) {
      direction.add(options.right.clone().multiplyScalar(moveX));
    }

    this._baseSpeed = options?.speed ?? 0;
    this.isMoving = direction.lengthSq() > 0;
    this._direction.copy(
      this.isMoving ? direction.normalize() : direction.set(0, 0, 0),
    );

    if (this.isMoving) {
      const yaw = Math.atan2(this._direction.x, this._direction.z);
      this.body.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), yaw);
    }
  }

  startJump(): boolean {
    const canJump = this.grounded || this.jumpCount < 2;
    if (!canJump) return false;

    this.jumpCount += 1;
    this.grounded = false;
    this.isJumping = true;
    this.reachedPeak = false;
    this._airborneTicks = 0;
    this._releaseMultiplier = 1;
    this._velocity.y = 0.45;

    return true;
  }

  releaseJump(): void {
    if (this._velocity.y > 0) {
      this._releaseMultiplier = 2.4;
      this._velocity.y *= 0.55;
    }
  }

  update(dt: number): void {
    this.speed = this.isMoving ? this._baseSpeed : 0;
    this._velocity.x = this._direction.x * this.speed * dt;
    this._velocity.z = this._direction.z * this.speed * dt;
    this.body.position.x += this._velocity.x;
    this.body.position.z += this._velocity.z;

    if (!this.grounded || this.isJumping) {
      this._airborneTicks += 1;
      this.coyoteTimeRemaining = 0;
      this._velocity.y -= 0.8 * this._releaseMultiplier * dt;
      this.reachedPeak ||= this._velocity.y <= 0;
      this.body.position.y += this._velocity.y;

      if (this.body.position.y <= 0) {
        this.body.position.y = 0;
        this._velocity.y = 0;
        this.grounded = true;
        this.isJumping = false;
        this.reachedPeak = false;
        this.jumpCount = 0;
        this._airborneTicks = 0;
        this._releaseMultiplier = 1;
      }
    } else {
      this._velocity.y = 0;
      this.coyoteTimeRemaining = 0.1;
    }
  }

  saveState(): MoverState {
    return {
      position: {
        x: this.body.position.x,
        y: this.body.position.y,
        z: this.body.position.z,
      },
      quaternion: {
        x: this.body.quaternion.x,
        y: this.body.quaternion.y,
        z: this.body.quaternion.z,
        w: this.body.quaternion.w,
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
        x: this._direction.x,
        y: this._direction.y,
        z: this._direction.z,
      },
      currentSpeed: this.speed,
      grounded: this.grounded,
      wasGrounded: this.grounded,
      wasMoving: this.isMoving,
      coyoteTimeLeft: this.coyoteTimeRemaining,
      targetRotation: Math.atan2(this._direction.x, this._direction.z),
      currentQuaternion: {
        x: this.body.quaternion.x,
        y: this.body.quaternion.y,
        z: this.body.quaternion.z,
        w: this.body.quaternion.w,
      },
      targetQuaternion: {
        x: this.body.quaternion.x,
        y: this.body.quaternion.y,
        z: this.body.quaternion.z,
        w: this.body.quaternion.w,
      },
      horizontalImpulse: { x: 0, z: 0 },
      verticalImpulse: 0,
      impulseDecayFrames: 0,
      jump: {
        count: this.jumpCount,
        isJumping: this.isJumping,
        reachedPeak: this.reachedPeak,
        elapsedTime: this._airborneTicks,
        jumpGravity: 0,
        jumpVelocity: 0.45,
        currentHeight: this.body.position.y,
        maxHeight: this.body.position.y,
        delay: 0,
        prevJumpKeyState: false,
      },
      baseSpeed: this._baseSpeed,
      releaseMultiplier: this._releaseMultiplier,
      airborneTicks: this._airborneTicks,
    } as MoverState;
  }

  restoreState(state: MoverState): void {
    const nextState = state as MoverState & {
      baseSpeed?: number;
      releaseMultiplier?: number;
      airborneTicks?: number;
    };

    this.body.position.set(state.position.x, state.position.y, state.position.z);
    this.body.quaternion.set(
      state.quaternion.x,
      state.quaternion.y,
      state.quaternion.z,
      state.quaternion.w,
    );
    this._velocity.set(state.velocity.x, state.velocity.y, state.velocity.z);
    this._direction.set(
      state.direction.x,
      state.direction.y,
      state.direction.z,
    );
    this.speed = state.currentSpeed;
    this.grounded = state.grounded;
    this.isMoving = state.currentSpeed > 0 || state.wasMoving;
    this.jumpCount = state.jump.count;
    this.isJumping = state.jump.isJumping;
    this.reachedPeak = state.jump.reachedPeak;
    this.coyoteTimeRemaining = state.coyoteTimeLeft;
    this._baseSpeed = nextState.baseSpeed ?? state.currentSpeed;
    this._releaseMultiplier = nextState.releaseMultiplier ?? 1;
    this._airborneTicks = nextState.airborneTicks ?? 0;
  }
}

export class FakeCommandSource
  implements CommandSource<NetPlatformerCommandFrame>
{
  private index = -1;
  private currentFrame = createEmptyNetPlatformerCommandFrame();

  constructor(private readonly commands: NetPlatformerCommandFrame[]) {}

  update(): void {
    this.index = Math.min(this.index + 1, this.commands.length - 1);
    this.currentFrame = this.commands[this.index] ?? this.currentFrame;
  }

  read(): NetPlatformerCommandFrame {
    return this.currentFrame;
  }

  dispose(): void {}
}

export function normalizeSimState(state: NetPlatformerSimState) {
  const round = (value: number) => Number(value.toFixed(6));

  return {
    tick: state.tick,
    sequence: state.sequence,
    command: {
      yaw: round(state.command.yaw),
      moveX: round(state.command.moveX),
      moveY: round(state.command.moveY),
      sprinting: state.command.sprinting,
    },
    mover: {
      grounded: state.mover.grounded,
      isMoving: state.mover.isMoving,
      speed: round(state.mover.speed),
      speedCategory: state.mover.speedCategory,
      velocity: {
        x: round(state.mover.velocity.x),
        y: round(state.mover.velocity.y),
        z: round(state.mover.velocity.z),
      },
      position: {
        x: round(state.mover.position.x),
        y: round(state.mover.position.y),
        z: round(state.mover.position.z),
      },
      quaternion: {
        x: round(state.mover.quaternion.x),
        y: round(state.mover.quaternion.y),
        z: round(state.mover.quaternion.z),
        w: round(state.mover.quaternion.w),
      },
      jumpCount: state.mover.jumpCount,
      isJumping: state.mover.isJumping,
      reachedPeak: state.mover.reachedPeak,
      coyoteTimeRemaining: round(state.mover.coyoteTimeRemaining),
    },
    derived: {
      justLanded: state.derived.justLanded,
      justBecameAirborne: state.derived.justBecameAirborne,
      jumpSpeedCategory: state.derived.jumpSpeedCategory,
      jumpedThisTick: state.derived.jumpedThisTick,
      landingVelocityY: round(state.derived.landingVelocityY),
    },
  };
}
