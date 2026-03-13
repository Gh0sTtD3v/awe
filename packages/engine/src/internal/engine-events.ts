import { GameEventListeners, GameEvents } from "./game-events";
import type { Object3D } from "three";

/**
 * Internal engine events - used by engine systems only.
 * Game developers should use the GAME_* equivalents from Events.
 *
 * @internal
 */
export const EngineEvents = {
  /** Space destroy requested. Callback: `(space: Space) => void` */
  SPACE_DESTROY_REQUESTED: "space_destroy_requested",

  /** Physics simulation phase. Callback: `(delta, absTimer) => void` */
  PHYSICS_UPDATE: "physics_update",

  /** Main gameplay update - engine systems + external code. Callback: `(delta, absTimer) => void` */
  UPDATE: "update",

  /** Late update - cameras, state sync, leaf systems. Callback: `(delta, absTimer) => void` */
  LATE_UPDATE: "late_update",

  /** Pre-render phase - uniforms, shaders, instance matrices. Callback: `(delta, absTimer) => void` */
  PRE_RENDER: "pre_render",

  /** Actual Three.js rendering phase. Callback: `(delta, absTimer) => void` */
  RENDER: "render",

  /** Post-render cleanup - workers, stats. Callback: `(delta, absTimer) => void` */
  POST_RENDER: "post_render",

  /** Before fixed update loop. Callback: `(iterationCount) => void` */
  BEFORE_FIXED_UPDATES: "before_fixed_updates",

  /** Fixed timestep update. Callback: `(delta, absTimer, iteration, totalIterations) => void` */
  FIXED_UPDATE: "fixed_update",

  /** After fixed update. Callback: `(delta, absTimer) => void` */
  AFTER_FIXED_UPDATE: "after_fixed_update",

  /** After physics simulation phase. Callback: `(delta, absTimer) => void` */
  AFTER_PHYSICS_UPDATE: "after_physics_update",

  /** Emitted at frame start after raw input events have been dispatched. Callback: `(delta, absTimer) => void` */
  INPUT_PROCESS: "input_process",

  /** Fixed update interpolation. Callback: `(alpha) => void` */
  FIXED_INTERPOLATE: "fixed_interpolate",

  /** Emitted when engine starts playing */
  PLAY: "play",

  /** Emitted when engine is paused */
  PAUSE: "pause",

  /** Mirror/reflection rendering phase */
  MIRROR: "mirror",

  /** Occlusion culling phase */
  OCCLUSION: "occlusion",

  /** Lighting calculation phase */
  LIGHTING: "lighting",

  /** Before rendering a scene - passes scene/camera context. Callback: `(scene, camera, force?) => void` */
  BEFORE_SCENE_RENDER: "before_scene_render",

  // ─── Input (Internal) ─────────────────────────────────────────────────
  /** Key pressed. Callback: `(event: KeyboardEvent) => void` */
  KEY_DOWN: "keydown",

  /** Key released. Callback: `(event: KeyboardEvent) => void` */
  KEY_UP: "keyup",

  /** Mouse button pressed. Callback: `(data: MouseEventData | VREventData) => void` */
  MOUSE_DOWN: "mousedown",

  /** Mouse moved. Callback: `(data: MouseEventData | VREventData) => void` */
  MOUSE_MOVE: "mousemove",

  /** Mouse button released. Callback: `(data: MouseEventData | VREventData) => void` */
  MOUSE_UP: "mouseup",

  /** Mouse left canvas. Callback: `(data: MouseEventData) => void` */
  MOUSE_LEAVE: "mouseleave",

  /** Click detected. Callback: `(data: MouseEventData | VREventData) => void` */
  CLICK: "click",

  /** Double-click. Callback: `(data: MouseEventData) => void` */
  DBL_CLICK: "dblclick",

  /** Mouse wheel. Callback: `(event: WheelEvent) => void` */
  WHEEL: "wheel",

  /** Virtual joystick input. Callback: `(data: JoystickData) => void` */
  JOYSTICK: "joystick",

  /** Touch moved. Callback: `(data: MouseEventData) => void` */
  TOUCH_MOVE: "touchmove",

  /** Touch started. Callback: `(data: MouseEventData) => void` */
  TOUCH_START: "touchstart",

  /** Touch ended. Callback: `(data: MouseEventData) => void` */
  TOUCH_END: "touchend",

  /** Touch cancelled. Callback: `(data: MouseEventData) => void` */
  TOUCH_CANCEL: "touchcancel",

  /** Pointer lock state changed. Callback: `(locked: boolean) => void` */
  POINTER_LOCK: "pointer_lock",

  /** Viewport resized. Callback: `(width: number, height: number) => void` */
  RESIZE: "resize",

  // game events
  ...GameEvents,
} as const;

/**
 * Type representing all valid internal engine event keys.
 * @internal
 */
export type EngineEventKey = keyof typeof EngineEvents;

/**
 * Type representing all valid internal engine event string values.
 * @internal
 */
export type EngineEventValue = (typeof EngineEvents)[EngineEventKey];

/**
 * Mouse and touch event data.
 * @internal
 */
export interface MouseEventData {
  /** The original browser event */
  rawEvent: MouseEvent | Touch;
  /** Whether multitouch is active */
  multitouch: boolean;
  /** Whether dragging is in progress */
  isDragging: boolean;
  /** Event timestamp */
  time: number;
  /** Normalized coordinates (-1 to 1) */
  normalized: { x: number; y: number };
  /** Raw pixel coordinates and metadata */
  raw: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    screenX: number;
    screenY: number;
    ctrlKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
    button: number;
  };
  /** Drag origin point (if dragging) */
  origin?: {
    normalized: { x: number; y: number };
    raw: { x: number; y: number };
  };
  /** Mouse move events collected during a frame */
  mousemovePackets?: MouseEventData[];
}

/**
 * VR controller event data.
 * @internal
 */
export interface VREventData {
  isVR: true;
  isDragging: boolean;
  controller: Object3D;
  index: number;
}

/**
 * Virtual joystick input data.
 * @internal
 */
export interface JoystickData {
  /** Horizontal axis (-1 to 1) */
  x: number;
  /** Vertical axis (-1 to 1) */
  y: number;
}

/**
 * Type-safe event listener signatures for internal engine events.
 *
 * @internal
 */
export interface EngineEventListeners extends GameEventListeners {
  /** ─── Frame Loop Events ─────────────────────────────────────────────── */

  /** Physics simulation phase. */
  [EngineEvents.PHYSICS_UPDATE]: (delta: number, absTimer: number) => void;
  /** Main gameplay update - engine systems + external code. */
  [EngineEvents.UPDATE]: (delta: number, absTimer: number) => void;
  /** Late update - cameras, state sync, leaf systems. */
  [EngineEvents.LATE_UPDATE]: (delta: number, absTimer: number) => void;
  /** Pre-render phase - uniforms, shaders, instance matrices. */
  [EngineEvents.PRE_RENDER]: (delta: number, absTimer: number) => void;
  /** Actual Three.js rendering phase. */
  [EngineEvents.RENDER]: (delta: number, absTimer: number) => void;
  /** Post-render cleanup - workers, stats. */
  [EngineEvents.POST_RENDER]: (delta: number, absTimer: number) => void;

  /** ─── Fixed Update Events ───────────────────────────────────────────── */

  /** Before fixed update loop. */
  [EngineEvents.BEFORE_FIXED_UPDATES]: (iterationCount: number) => void;
  /** Fixed timestep update. */
  [EngineEvents.FIXED_UPDATE]: (
    delta: number,
    absTimer: number,
    iteration: number,
    totalIterations: number
  ) => void;
  /** After fixed update. */
  [EngineEvents.AFTER_FIXED_UPDATE]: (delta: number, absTimer: number) => void;
  /** After physics simulation phase. */
  [EngineEvents.AFTER_PHYSICS_UPDATE]: (
    delta: number,
    absTimer: number
  ) => void;
  /** Fixed update interpolation. */
  [EngineEvents.FIXED_INTERPOLATE]: (alpha: number) => void;

  /** ─── Input Events ──────────────────────────────────────────────────── */

  /** Emitted at frame start after raw input events have been dispatched. */
  [EngineEvents.INPUT_PROCESS]: (delta: number, absTimer: number) => void;

  /** ─── Playback Events ───────────────────────────────────────────────── */

  /** Emitted when engine starts playing. */
  [EngineEvents.PLAY]: () => void;
  /** Emitted when engine is paused. */
  [EngineEvents.PAUSE]: () => void;

  /** ─── Rendering Events ──────────────────────────────────────────────── */

  /** Mirror/reflection rendering phase. */
  [EngineEvents.MIRROR]: () => void;
  /** Occlusion culling phase. */
  [EngineEvents.OCCLUSION]: () => void;
  /** Lighting calculation phase. */
  [EngineEvents.LIGHTING]: () => void;
  /** Before rendering a scene - passes scene/camera context. */
  [EngineEvents.BEFORE_SCENE_RENDER]: (
    scene: unknown,
    camera: unknown,
    force?: boolean
  ) => void;

  /** ─── Mouse & Pointer Events ────────────────────────────────────────── */

  /** Mouse button or touch pressed. */
  [EngineEvents.MOUSE_DOWN]: (data: MouseEventData | VREventData) => void;
  /** Mouse moved or touch dragged. */
  [EngineEvents.MOUSE_MOVE]: (data: MouseEventData | VREventData) => void;
  /** Mouse button or touch released. */
  [EngineEvents.MOUSE_UP]: (data: MouseEventData | VREventData) => void;
  /** Mouse cursor left the canvas. */
  [EngineEvents.MOUSE_LEAVE]: (data: MouseEventData) => void;
  /** Click detected (<10px movement, <1s duration). */
  [EngineEvents.CLICK]: (data: MouseEventData | VREventData) => void;
  /** Double-click detected. */
  [EngineEvents.DBL_CLICK]: (data: MouseEventData) => void;

  /** ─── Keyboard Events ───────────────────────────────────────────────── */

  /** Key pressed (when canvas has focus). */
  [EngineEvents.KEY_DOWN]: (event: KeyboardEvent) => void;
  /** Key released. */
  [EngineEvents.KEY_UP]: (event: KeyboardEvent) => void;

  /** ─── Wheel & Touch Events ──────────────────────────────────────────── */

  /** Mouse wheel scrolled. */
  [EngineEvents.WHEEL]: (event: WheelEvent) => void;
  /** Touch begins on canvas. */
  [EngineEvents.TOUCH_START]: (data: MouseEventData) => void;
  /** Touch point moves. */
  [EngineEvents.TOUCH_MOVE]: (data: MouseEventData) => void;
  /** Touch ends. */
  [EngineEvents.TOUCH_END]: (data: MouseEventData) => void;
  /** Touch cancelled. */
  [EngineEvents.TOUCH_CANCEL]: (data: MouseEventData) => void;

  /** ─── Other Input Events ────────────────────────────────────────────── */

  /** Pointer lock state changed. */
  [EngineEvents.POINTER_LOCK]: (locked: boolean) => void;
  /** Virtual joystick input. */
  [EngineEvents.JOYSTICK]: (data: JoystickData) => void;

  /** ─── Viewport Events ───────────────────────────────────────────────── */

  /** Viewport dimensions changed. */
  [EngineEvents.RESIZE]: (width: number, height: number) => void;
}
