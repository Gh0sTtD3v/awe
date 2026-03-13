import { EngineEventListeners } from "../engine-events";

/**
 * Error payload passed to error listeners.
 * @public
 */
export interface ErrorPayload {
  error: unknown;
  scope?: "engine" | "script";
  data?: unknown;
  script?: unknown;
}

/**
 * Configuration options for an event emitter.
 * @public
 */
export interface EventEmitterOpts {
  scope: "engine" | "script";
  parent?: unknown;
  data?: unknown;
  script?: unknown;
}

const defaultOpts: EventEmitterOpts = {
  scope: "engine",
};

/**
 * Generic listener function type.
 * @public
 */
export type Listener = (...args: any[]) => any;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type DefaultEventMap = {};

/**
 * Type-safe event emitter with support for custom event maps.
 *
 * @example
 * ```ts
 * import { Emitter, Events } from 'engine/events';
 *
 * // Subscribe to events
 * Emitter.on(Events.GAME_UPDATE, (delta, absTimer) => {
 *   console.log('Frame delta:', delta);
 * });
 *
 * // One-time listener
 * Emitter.once(Events.GAME_READY, () => {
 *   console.log('Game ready!');
 * });
 * ```
 *
 * @public
 */
export default class Augmented<EventMap extends DefaultEventMap = any> {
  private _cbs = new Map<string, Listener[]>();
  private _currentEmit: string | null = null;
  private _pendingOns: Listener[] = [];
  private _pendingOffs: Listener[] = [];

  /** Global event emitter shared across the engine */
  static engineEmitter = new Augmented<EngineEventListeners>({
    scope: "engine",
  });

  constructor(public _aOpts?: EventEmitterOpts) {
    this._aOpts = { ...defaultOpts, ...(_aOpts || {}) };
  }

  /**
   * Registers an event listener.
   * @param type - Event type to listen for
   * @param callback - Function to call when event is emitted
   */
  on<K extends keyof EventMap>(
    type: K,
    callback: EventMap[K] extends Listener ? EventMap[K] : Listener
  ): void;
  on(type: string, callback: Listener): void;
  on(type: string, callback: Listener): void {
    if (this._currentEmit === type) {
      this._pendingOns.push(callback);
      return;
    }

    if (!validateType(type) || !validateCallback(callback)) {
      return;
    }

    let cbs = this._cbs.get(type);

    if (cbs === undefined) {
      cbs = [];
      this._cbs.set(type, cbs);
    }

    if (cbs.indexOf(callback) !== -1) {
      return;
    }

    cbs.push(callback);
  }

  /**
   * Registers a one-time event listener that removes itself after being called.
   * @param type - Event type to listen for
   * @param callback - Function to call once
   */
  once<K extends keyof EventMap>(
    type: K,
    callback: EventMap[K] extends Listener ? EventMap[K] : Listener
  ): void;
  once(type: string, callback: Listener): void;
  once(type: string, callback: Listener): void {
    const onceCallback = (...args: unknown[]) => {
      callback(...args);
      this.off(type, onceCallback);
    };

    this.on(type, onceCallback);
  }

  /**
   * Removes an event listener.
   * @param type - Event type to stop listening for
   * @param callback - The exact function that was registered
   */
  off<K extends keyof EventMap>(
    type: K,
    callback: EventMap[K] extends Listener ? EventMap[K] : Listener
  ): void;
  off(type: string, callback: Listener): void;
  off(type: string, callback: Listener): void {
    if (this._currentEmit === type) {
      this._pendingOffs.push(callback);
      return;
    }

    if (!validateType(type) || !validateCallback(callback)) {
      return;
    }

    const cbs = this._cbs.get(type);
    if (cbs === undefined) return;

    const index = cbs.indexOf(callback);
    if (index === -1) return;

    if (index === cbs.length - 1) {
      cbs.length--;
    } else {
      spliceOne(cbs, index);
    }
  }

  /**
   * Emits an event, calling all registered listeners.
   * @param type - Event type to emit
   * @param args - Arguments to pass to listeners
   */
  emit<K extends keyof EventMap>(
    type: K,
    ...args: EventMap[K] extends Listener ? Parameters<EventMap[K]> : any[]
  ): void;
  emit(type: string, ...args: any[]): void;
  emit(type: string, ...args: any[]): void {
    try {
      this._currentEmit = type;

      const cbs = this._cbs.get(type);

      if (cbs === undefined || cbs.length < 1) return;

      for (let i = 0; i < cbs.length; i++) {
        try {
          const cb = cbs[i];

          const res = cb(...args);

          if (
            res != null &&
            typeof res === "object" &&
            "then" in res &&
            typeof res.then === "function" &&
            "catch" in res &&
            typeof res.catch === "function"
          ) {
            (res as Promise<unknown>).catch(this._handleRejection);
          }
        } catch (error) {
          console.error("Unhandled Error in event listener", type, error);
          this._emitError(this._getErrPayload(error));
        }
      }
    } finally {
      this._currentEmit = null;

      if (this._pendingOns.length > 0) {
        for (let i = 0; i < this._pendingOns.length; i++) {
          this.on(type, this._pendingOns[i]);
        }
        this._pendingOns = [];
      }

      if (this._pendingOffs.length > 0) {
        for (let i = 0; i < this._pendingOffs.length; i++) {
          this.off(type, this._pendingOffs[i]);
        }
        this._pendingOffs = [];
      }
    }
  }

  /**
   * Emits an error to all error listeners.
   * @param err - The error that occurred
   * @param opts - Optional scope and context
   */
  emitError(
    err: Error,
    opts?: { scope: "engine" | "script"; data?: unknown; script?: unknown }
  ) {
    this._emitError({
      error: err,
      ...opts,
    });
  }

  private _errorCbs: Listener[] = [];

  /**
   * Registers an error listener.
   * @param cb - Function to call when an error occurs
   */
  onError(cb: Listener) {
    this._errorCbs.push(cb);
  }

  /**
   * Removes an error listener.
   * @param cb - The error listener to remove
   */
  offError(cb: Listener) {
    const index = this._errorCbs.indexOf(cb);

    if (index !== -1) {
      this._errorCbs.splice(index, 1);
    }
  }

  _handleRejection = (error: unknown) => {
    console.error("Unhandled rejection in event listener", error);
    this._emitError(this._getErrPayload(error));
  };

  _emitError(payload: ErrorPayload) {
    const cbs = this._errorCbs.slice();
    for (let i = 0; i < cbs.length; i++) {
      try {
        const cb = cbs[i];
        cb(payload);
      } catch (error) {
        console.error("Unhandled Error in error listener", error);
      }
    }

    if ((this as unknown) !== Augmented.engineEmitter) {
      Augmented.engineEmitter._emitError(payload);
    }
  }

  /**
   * @internal
   */
  _getErrPayload(error: unknown): ErrorPayload {
    return {
      error,
      scope: this._aOpts?.scope,
      data: this._aOpts?.data ?? {},
      script: this._aOpts?.script,
    };
  }

  /**
   * Removes all listeners for a specific event type, or all listeners if no type specified.
   * @param type - Event type to clear (optional)
   */
  removeAllListeners(type?: string): void {
    if (type === undefined) {
      this._cbs.clear();
    } else {
      this._cbs.delete(type);
    }
  }

  /**
   * Checks if there are any listeners for the given event type.
   * @param type - Event type to check
   */
  hasListeners(type: string) {
    return this._cbs.get(type)?.length > 0;
  }

  /**
   * Returns the number of listeners for the given event type.
   * @param type - Event type to count
   */
  listenerCount(type: string) {
    return this._cbs.get(type)?.length || 0;
  }

  /**
   * Returns the total number of event listeners across all event types.
   */
  getEventCount() {
    let count = 0;

    this._cbs.forEach((cbs) => {
      count += cbs.length;
    });

    return count;
  }

  /**
   * Removes all listeners and cleans up the emitter.
   */
  dispose() {
    this._cbs.clear();
    this._errorCbs = [];
  }
}

function validateType(type: string) {
  if (!type) {
    console.error("Emitter: type is empty");
    return false;
  }

  if (typeof type !== "string") {
    console.error("Emitter: type is not a string");
    return false;
  }

  return true;
}

function validateCallback(callback: Listener) {
  if (!callback) {
    console.error("Emitter: callback is empty");
    return false;
  }

  if (typeof callback !== "function") {
    console.error("Emitter: callback is not a function");
    return false;
  }

  return true;
}

function spliceOne<T>(list: T[], index: number): void {
  for (; index + 1 < list.length; index++) list[index] = list[index + 1];
  list.pop();
}
