import type { Camera as ThreeCamera } from "three";
import type { SpaceOpts } from "../@types/space-opts";
import type { PhysicsEngine } from "../physics/types";
import { EngineEvents } from "../internal/engine-events";
import emitter from "../internal/engine-emitter";
import Camera from "../camera";
import Scene from "../internal/scene";
import { ComponentManager } from "./components";
import ScreenshotRendering from "../internal/screenshot";
import AugmentedGroup from "../internal/events/augmented-group";
import { ComponentsRegistry } from "./registry";
import { deferred } from "../internal/utils/deferred";
import { SpaceLifecycle } from "./space-lifecycle";
import { SpaceEvents, type SpaceEventHandlers } from "./space-events";
import {
  SpaceScheduler,
  type SpaceScheduleHandle,
} from "./space-scheduler";

/**
 * @public
 *
 * Repersents the container for all objects in the scene for the current game.
 *
 * This class is a wrapper around the ThreeJS {@link https://threejs.org/docs/index.html?q=Group#api/en/objects/Group | Group } class.
 */
export class Space extends AugmentedGroup {
  components: ComponentManager | null = null;
  registry: ComponentsRegistry | null = null;
  physics: PhysicsEngine | null = null;
  options: SpaceOpts | null;

  /** @internal */
  _lifecycle: SpaceLifecycle | null = null;
  /** @internal */
  _isReady = false;
  /** @internal */
  _readyDeferred = deferred<void>();
  /** @internal */
  _wasDisposed = false;
  /** @internal */
  _scheduler: SpaceScheduler;

  /**
   * @internal
   */
  constructor(opts: SpaceOpts) {
    super();

    this.options = opts;

    this.matrixAutoUpdate = false;

    globalThis["$space"] = this;
    this._scheduler = new SpaceScheduler(this);

    emitter.once(EngineEvents.GAME_POST_READY, () => {
      //
      if (this._wasDisposed) return;

      this._isReady = true;

      this._readyDeferred.resolve();

      if (this.options?.loadOpts?.autoStart === "auto") {
        setTimeout(() => {
          this.start();
        }, 0);
      }
    });
  }

  /**
   * @deprecated Use {@link Space#ready} instead.
   */
  get isReady() {
    return this._isReady;
  }

  /**
   * Returns a promise that resolves when the space is ready.
   */
  get ready() {
    return this._readyDeferred.promise;
  }

  /**
   * Returns the current camera in the scene. cf {@link MainCamera}
   */
  get camera() {
    return Camera.current;
  }

  /**
   * Sets the current camera in the scene.
   */
  set camera(camera: ThreeCamera) {
    Camera.current = camera;
  }

  /**
   * @internal
   */
  get scene() {
    return Scene;
  }

  get background() {
    return this.components?.background;
  }

  get fog() {
    return this.components?.fog;
  }

  /**
   * @internal
   */
  get lighting() {
    return this.components?.lighting;
  }

  get envMap() {
    return this.components?.envMap;
  }

  /**
   * Use this method to start the current game.
   */
  start(payload?: unknown): void {
    emitter.emit(EngineEvents.GAME_START, payload);
  }

  /**
   * Use this method to stop the current game.
   */
  stop(payload?: unknown): void {
    emitter.emit(EngineEvents.GAME_STOP, payload);
  }

  /**
   * Schedule a callback to run after the given number of game seconds.
   *
   * The timer advances only while the space is running, so it pauses when the
   * game stops or the engine loop is paused.
   */
  schedule(delaySeconds: number, callback: () => void): SpaceScheduleHandle {
    return this._scheduler.schedule(delaySeconds, callback);
  }

  /**
   * Takes a screenshot of the current frame. Returns a promise that resolves to the data URL of the screenshot.
   */
  captureFrame(
    opts: { width?: number; height?: number } = {}
  ): Promise<string> {
    return ScreenshotRendering.captureFrame({ space: this, ...opts });
  }

  /**
   * @internal
   */
  _onEngineEvent(event: string, listener: (payload: any) => void): () => void {
    //
    emitter.on(event, listener);

    return () => {
      //
      emitter.off(event, listener);
    };
  }

  /**
   * @internal
   */
  dispose(): void {
    //
    if (this._wasDisposed) return;

    this._wasDisposed = true;

    this._scheduler.dispose();
    this.components = null;

    this.physics = null;

    this.options = null;
  }

  /**
   * Register multiple event handlers at once.
   * Returns a cleanup function that removes all registered handlers.
   *
   * @example
   * ```ts
   * const cleanup = space.use({
   *   onFrame: (dt) => { updateUI(dt); },
   *   onUpdate: (dt) => { updatePlayer(dt); },
   *   onDispose: () => { saveGame(); },
   * });
   *
   * // Later, remove all handlers:
   * cleanup();
   * ```
   */
  use(handlers: SpaceEventHandlers): () => void {
    const unsubs: Array<() => void> = [];

    if (handlers.onStart) {
      const handler = handlers.onStart;
      this.on(SpaceEvents.START, handler);
      unsubs.push(() => this.off(SpaceEvents.START, handler));
    }

    if (handlers.onStop) {
      const handler = handlers.onStop;
      this.on(SpaceEvents.STOP, handler);
      unsubs.push(() => this.off(SpaceEvents.STOP, handler));
    }

    if (handlers.onFrame) {
      const handler = handlers.onFrame;
      this.on(SpaceEvents.FRAME, handler);
      unsubs.push(() => this.off(SpaceEvents.FRAME, handler));
    }

    if (handlers.onUpdate) {
      const handler = handlers.onUpdate;
      this.on(SpaceEvents.UPDATE, handler);
      unsubs.push(() => this.off(SpaceEvents.UPDATE, handler));
    }

    if (handlers.onFixedUpdate) {
      const handler = handlers.onFixedUpdate;
      this.on(SpaceEvents.FIXED_UPDATE, handler);
      unsubs.push(() => this.off(SpaceEvents.FIXED_UPDATE, handler));
    }

    if (handlers.onLateUpdate) {
      const handler = handlers.onLateUpdate;
      this.on(SpaceEvents.LATE_UPDATE, handler);
      unsubs.push(() => this.off(SpaceEvents.LATE_UPDATE, handler));
    }

    if (handlers.onBeforeRender) {
      const handler = handlers.onBeforeRender;
      this.on(SpaceEvents.BEFORE_RENDER, handler);
      unsubs.push(() => this.off(SpaceEvents.BEFORE_RENDER, handler));
    }

    if (handlers.onDispose) {
      const handler = handlers.onDispose;
      this.once(SpaceEvents.DISPOSE, handler);
      unsubs.push(() => this.off(SpaceEvents.DISPOSE, handler));
    }

    return () => unsubs.forEach((fn) => fn());
  }

  /**
   * Destroy the space and clean up all resources.
   * Alias for internal disposal with lifecycle cleanup.
   */
  destroy(): void {
    if (this._wasDisposed) return;
    this._wasDisposed = true;
    this._lifecycle?.dispose();
    this._lifecycle = null;
    emitter.emit(EngineEvents.SPACE_DESTROY_REQUESTED, this);
  }
}
