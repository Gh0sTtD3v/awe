/**
 * Space-scoped event constants.
 *
 * @public
 */
export const SpaceEvents = {
  /** Fires when space.start() is called */
  START: "start",
  /** Fires when space.stop() is called */
  STOP: "stop",
  /** Fires every frame after space is ready (even when stopped) */
  FRAME: "frame",
  /** Fires every frame when space is running (after start()) */
  UPDATE: "update",
  /** Fixed timestep update when space is running */
  FIXED_UPDATE: "fixedUpdate",
  /** Late update when space is running */
  LATE_UPDATE: "lateUpdate",
  /** Before render, fires every frame after space is ready */
  BEFORE_RENDER: "beforeRender",
  /** Fires when space is destroyed */
  DISPOSE: "dispose",
} as const;

/**
 * Type representing space event values.
 * @public
 */
export type SpaceEventValue = (typeof SpaceEvents)[keyof typeof SpaceEvents];

/**
 * Type-safe event listener signatures for space events.
 *
 * @public
 */
export interface SpaceEventListeners {
  [SpaceEvents.START]: () => void;
  [SpaceEvents.STOP]: () => void;
  [SpaceEvents.FRAME]: (dt: number, abs: number) => void;
  [SpaceEvents.UPDATE]: (dt: number, abs: number) => void;
  [SpaceEvents.FIXED_UPDATE]: (dt: number, abs: number) => void;
  [SpaceEvents.LATE_UPDATE]: (dt: number, abs: number) => void;
  [SpaceEvents.BEFORE_RENDER]: () => void;
  [SpaceEvents.DISPOSE]: () => void;
}

/**
 * Event handlers for space.use() method.
 *
 * @public
 */
export interface SpaceEventHandlers {
  /** Called when space.start() is called */
  onStart?: () => void;
  /** Called when space.stop() is called */
  onStop?: () => void;
  /** Called every frame after space is ready (even when stopped) */
  onFrame?: (dt: number, abs: number) => void;
  /** Called every frame when space is running */
  onUpdate?: (dt: number, abs: number) => void;
  /** Called at fixed timestep when space is running */
  onFixedUpdate?: (dt: number, abs: number) => void;
  /** Called after update when space is running */
  onLateUpdate?: (dt: number, abs: number) => void;
  /** Called before render, every frame after space is ready */
  onBeforeRender?: () => void;
  /** Called when space is destroyed */
  onDispose?: () => void;
}
