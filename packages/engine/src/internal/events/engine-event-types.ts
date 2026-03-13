import type { Object3D } from "three";
import { EngineEvents } from "../engine-events";

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
export interface EngineEventListeners {
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
