import type { Space } from "./space";
import { SpaceEvents } from "./space-events";
import engineEmitter from "../internal/engine-emitter";
import { EngineEvents } from "../internal/engine-events";

/**
 * Per-space lifecycle manager.
 *
 * Subscribes to engine frame events and emits space-scoped events.
 * - `frame` fires every frame after space is ready (even when stopped)
 * - `update`, `fixedUpdate`, `lateUpdate` only fire when running
 *
 * @internal
 */
export class SpaceLifecycle {
  private _space: Space;
  private _isRunning = false;
  private _isReady = false;
  private _subs: Array<() => void> = [];

  constructor(space: Space) {
    this._space = space;
  }

  get isRunning() {
    return this._isRunning;
  }

  get isReady() {
    return this._isReady;
  }

  /**
   * Initialize lifecycle - subscribe to engine events.
   * Called after space components are built.
   */
  init() {
    this._subscribe(EngineEvents.UPDATE, this._onUpdate);
    this._subscribe(EngineEvents.LATE_UPDATE, this._onLateUpdate);
    this._subscribe(EngineEvents.FIXED_UPDATE, this._onFixedUpdate);
    this._subscribe(EngineEvents.PRE_RENDER, this._onPreRender);
    this._subscribe(EngineEvents.GAME_START, this._onStart);
    this._subscribe(EngineEvents.GAME_STOP, this._onStop);
    this._subscribe(EngineEvents.GAME_POST_READY, this._onReady);
  }

  private _subscribe(event: string, handler: (...args: any[]) => void) {
    engineEmitter.on(event, handler);
    this._subs.push(() => engineEmitter.off(event, handler));
  }

  private _onReady = () => {
    this._isReady = true;
  };

  private _onStart = () => {
    this._isRunning = true;
    this._space.emit(SpaceEvents.START);
  };

  private _onStop = () => {
    this._isRunning = false;
    this._space.emit(SpaceEvents.STOP);
  };

  private _onUpdate = (dt: number, absTime: number) => {
    if (!this._isReady) return;

    // frame always fires when ready
    this._space.emit(SpaceEvents.FRAME, dt, absTime);

    // update only when running
    if (this._isRunning) {
      this._space.emit(SpaceEvents.UPDATE, dt, absTime);
    }
  };

  private _onLateUpdate = (dt: number, absTime: number) => {
    if (!this._isReady || !this._isRunning) return;

    this._space.emit(SpaceEvents.LATE_UPDATE, dt, absTime);
  };

  private _onFixedUpdate = (dt: number, absTime: number) => {
    if (!this._isReady || !this._isRunning) return;

    this._space.emit(SpaceEvents.FIXED_UPDATE, dt, absTime);
  };

  private _onPreRender = () => {
    if (!this._isReady) return;

    this._space.emit(SpaceEvents.BEFORE_RENDER);
  };

  /**
   * Dispose lifecycle - unsubscribe from all events.
   */
  dispose() {
    // Emit dispose event on space
    this._space.emit(SpaceEvents.DISPOSE);

    // Unsubscribe from engine events
    this._subs.forEach((unsub) => unsub());
    this._subs = [];

    this._isRunning = false;
    this._isReady = false;
  }
}
