import emitter from "./engine-emitter";
import { EngineEvents } from "./engine-events";

/**
 * Headless tick driver for server-side simulation.
 *
 * Emits the same core simulation events as the web Mediator,
 * minus render phases (PRE_RENDER, RENDER, POST_RENDER).
 *
 * Event order per tick (matches web Mediator):
 *   INPUT_PROCESS → PHYSICS_UPDATE → AFTER_PHYSICS_UPDATE → UPDATE → LATE_UPDATE
 *
 * @internal
 */
export class HeadlessLoop {
  private _absTimer = 0;
  private _isRunning = false;
  private _intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Step the simulation forward by `dt` seconds.
   *
   * Emits simulation events in the same order as the web Mediator:
   * INPUT_PROCESS → PHYSICS_UPDATE → AFTER_PHYSICS_UPDATE → UPDATE → LATE_UPDATE
   */
  tick(dt: number): void {
    this._absTimer += dt;

    emitter.emit(EngineEvents.INPUT_PROCESS, dt, this._absTimer);
    emitter.emit(EngineEvents.PHYSICS_UPDATE, dt, this._absTimer);
    emitter.emit(EngineEvents.AFTER_PHYSICS_UPDATE, dt, this._absTimer);
    emitter.emit(EngineEvents.UPDATE, dt, this._absTimer);
    emitter.emit(EngineEvents.LATE_UPDATE, dt, this._absTimer);
  }

  /**
   * Start an automatic tick loop at the given frequency.
   * Each interval fires a tick with `dt = 1 / hz`.
   */
  run(opts: { hz: number }): void {
    if (this._isRunning) return;

    this._isRunning = true;
    const dt = 1 / opts.hz;
    const intervalMs = dt * 1000;

    emitter.emit(EngineEvents.PLAY);

    this._intervalId = setInterval(() => {
      this.tick(dt);
    }, intervalMs);
  }

  /**
   * Stop the automatic tick loop.
   */
  stop(): void {
    if (!this._isRunning) return;

    this._isRunning = false;

    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }

    emitter.emit(EngineEvents.PAUSE);
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  get absTimer(): number {
    return this._absTimer;
  }

  dispose(): void {
    this.stop();
    this._absTimer = 0;
  }
}
