import type { Space } from "./space";
import { SpaceEvents } from "./space-events";

const SCHEDULE_EPSILON = 1e-9;

/**
 * Handle returned by {@link Space.schedule}.
 *
 * @public
 */
export interface SpaceScheduleHandle {
  /**
   * Cancel the scheduled callback if it has not run yet.
   */
  cancel(): void;

  /**
   * Whether the scheduled callback is still pending.
   */
  readonly active: boolean;
}

interface ScheduledTask {
  id: number;
  active: boolean;
  remaining: number;
  callback: () => void;
}

/**
 * Advances scheduled callbacks using space update time.
 *
 * Timers only progress while the space is running, so they naturally pause
 * when the game stops or the engine loop is paused.
 *
 * @internal
 */
export class SpaceScheduler {
  private _space: Space;
  private _disposed = false;
  private _nextId = 1;
  private _tasks = new Map<number, ScheduledTask>();

  constructor(space: Space) {
    this._space = space;
    this._space.on(SpaceEvents.UPDATE, this._onUpdate);
    this._space.on(SpaceEvents.DISPOSE, this._onDispose);
  }

  schedule(delaySeconds: number, callback: () => void): SpaceScheduleHandle {
    if (this._disposed) {
      throw new Error("Cannot schedule work on a disposed space.");
    }

    if (!Number.isFinite(delaySeconds) || delaySeconds < 0) {
      throw new Error("space.schedule(delay, callback) requires a non-negative finite delay.");
    }

    if (typeof callback !== "function") {
      throw new Error("space.schedule(delay, callback) requires a callback function.");
    }

    const task: ScheduledTask = {
      id: this._nextId++,
      active: true,
      remaining: delaySeconds,
      callback,
    };

    this._tasks.set(task.id, task);

    return {
      cancel: () => {
        if (!task.active) return;
        task.active = false;
        this._tasks.delete(task.id);
      },
      get active() {
        return task.active;
      },
    };
  }

  dispose(): void {
    if (this._disposed) return;

    this._disposed = true;
    for (const task of this._tasks.values()) {
      task.active = false;
    }
    this._tasks.clear();
    this._space.off(SpaceEvents.UPDATE, this._onUpdate);
    this._space.off(SpaceEvents.DISPOSE, this._onDispose);
  }

  private _onUpdate = (dt: number) => {
    if (this._disposed || this._tasks.size === 0) return;

    const due: ScheduledTask[] = [];

    for (const task of this._tasks.values()) {
      if (!task.active) continue;

      task.remaining -= dt;

      if (task.remaining <= SCHEDULE_EPSILON) {
        task.active = false;
        this._tasks.delete(task.id);
        due.push(task);
      }
    }

    for (const task of due) {
      try {
        task.callback();
      } catch (error) {
        this._space._emitError(error, { scope: "script" });
      }
    }
  };

  private _onDispose = () => {
    this.dispose();
  };
}
