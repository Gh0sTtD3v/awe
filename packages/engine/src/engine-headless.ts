import { Engine } from "./engine";
import { HeadlessLoop } from "./internal/headless-loop";
import { WorldHeadless } from "./internal/world-headless";
import type { RuntimeProfile } from "./@types/enter-space-opts";

export class EngineHeadless extends Engine {
  private _headlessLoop: HeadlessLoop | null = null;

  /**
   * Step the headless simulation forward by `dt` seconds.
   *
   * Emits simulation events in the same order as the web frame loop:
   * `INPUT_PROCESS → PHYSICS_UPDATE → AFTER_PHYSICS_UPDATE → UPDATE → LATE_UPDATE`
   *
   * @example
   * ```ts
   * const engine = EngineHeadless.getInstance();
   * const { space } = await engine.createSpace({ runtime: "headless", game });
   * space.start();
   *
   * // Step at 60 Hz
   * engine.tick(1 / 60);
   * ```
   */
  tick(dt: number): void {
    if (!this._headlessLoop) {
      this._headlessLoop = new HeadlessLoop();
    }
    this._headlessLoop.tick(dt);
  }

  /**
   * Start an automatic headless tick loop at the given frequency.
   *
   * @example
   * ```ts
   * engine.run({ hz: 60 }); // 60 ticks per second
   * // later:
   * engine.stopRun();
   * ```
   */
  run(opts: { hz: number }): void {
    if (!this._headlessLoop) {
      this._headlessLoop = new HeadlessLoop();
    }
    this._headlessLoop.run(opts);
  }

  /**
   * Stop the automatic headless tick loop.
   */
  stopRun(): void {
    this._headlessLoop?.stop();
  }

  pause() {
    super.pause();
    this._headlessLoop?.stop();
  }

  protected async _ensureWorld(runtime: RuntimeProfile): Promise<void> {
    if (this._world && this._runtime === runtime) {
      await this.ready;
      return;
    }

    if (this._world) {
      await this._world.dispose();
      this._world = null;
      this._runtime = runtime;
    }

    this._world = new WorldHeadless();
    this._runtime = runtime;
    await this._world.preload();

    this._resolveReady();
  }

  protected _onSpaceCleanup(): void {
    if (this._headlessLoop) {
      this._headlessLoop.dispose();
      this._headlessLoop = null;
    }
  }

  private static _instance: EngineHeadless = null;

  static getInstance(): EngineHeadless {
    if (!EngineHeadless._instance) {
      EngineHeadless._instance = new EngineHeadless();
    }
    return EngineHeadless._instance;
  }
}
