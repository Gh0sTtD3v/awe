import { EngineEvents, MouseEventData, VREventData } from "./engine-events";
import emitter from "./engine-emitter";
import {
  CANVAS,
  DPI,
  SET_VIEW,
  SET_REAL_VIEW,
  IS_TOUCH,
  SET_ORIENTATION,
  LANDSCAPE,
  PORTRAIT,
  IS_POINTER_LOCK,
  FPS,
  SET_REAL_DPI,
} from "./constants";
import gsap from "gsap";
import { Vector3, Object3D } from "three";
import { resizer } from "./utils/resizer";

const LOCAL_EVENTS = {
  TOUCH_MOVE: "touchmove",
  TOUCH_START: "touchstart",
  TOUCH_END: "touchend",
  TOUCH_CANCEL: "touchcancel",
} as const;

const pos1 = new Vector3();
const pos2 = new Vector3();

interface TouchCache {
  startX: number;
  startY: number;
  clientX: number;
  clientY: number;
  dx: number;
  dy: number;
}

interface ResizeOptions {
  w?: number;
  h?: number;
  force?: boolean;
}

interface CanvasBoundingRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface VRInputEvent {
  isVR: true;
  controller: Object3D;
  index: number;
}

interface EndTouch {
  normalized: { x: number; y: number };
  raw: { x: number; y: number };
}

declare global {
  var $mediator: Mediator;
}

class Mediator {
  _lastPlaying: boolean;
  _isPlaying: boolean;
  now: number;
  absTimer: number;
  w: number;
  h: number;
  lastW: number;
  lastH: number;
  fullFrameX: number;
  fullFrameY: number;
  timeStampTap: number | null;

  mousemoveRef: (e: MouseEvent | TouchEvent) => void;
  mousedownRef: (e: MouseEvent | TouchEvent) => void;
  mouseupRef: (e: MouseEvent | TouchEvent) => void;
  updateEvent: () => void;
  mouseWheelRef: (e: WheelEvent) => void;
  keydownRef: (ev: KeyboardEvent) => void;
  keyupRef: (ev: KeyboardEvent) => void;
  pointerLockRef: (ev: Event) => void;
  dblClickRef: (e: MouseEvent) => void;

  canvasBoundingRect: CanvasBoundingRect;
  isDragging: boolean;
  firstTouch: Partial<TouchCache>;
  endTouch: EndTouch;
  touches: Record<number, TouchCache>;
  multitouch: boolean;

  mouseMovedStorage: MouseEventData | null;
  mouseUpStorage: MouseEventData | VREventData | null;
  mouseDownStorage: MouseEventData | VREventData | null;
  mouseClickStorage: MouseEventData | VREventData | null;
  mouseDblClickStorage: MouseEventData | null;
  wheelStorage: WheelEvent | null;
  mousemovePackets: MouseEventData[];

  // Keyboard event buffers
  keyDownBuffer: KeyboardEvent[];
  keyUpBuffer: KeyboardEvent[];

  lastMouseDown: MouseEventData | VREventData;

  private _requestPointerLockOnClick: boolean = false;

  constructor() {
    this._lastPlaying = false;
    this._isPlaying = false;
    this.now = Date.now();
    this.absTimer = 0;
    this.w = 0;
    this.h = 0;
    this.lastW = 0;
    this.lastH = 0;
    this.fullFrameX = 0;
    this.fullFrameY = 0;
    this.timeStampTap = null;

    this.mousemoveRef = this.mousemove.bind(this);
    this.mousedownRef = this.mousedown.bind(this);
    this.mouseupRef = this.mouseup.bind(this);
    this.updateEvent = () => this.update();
    this.mouseWheelRef = this.mouseWheel.bind(this);
    this.keydownRef = this.keydown.bind(this);
    this.keyupRef = this.keyup.bind(this);
    this.pointerLockRef = this.pointerLock.bind(this);
    this.dblClickRef = this.dblClick.bind(this);

    this.canvasBoundingRect = {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    };

    this.isDragging = false;
    this.firstTouch = {};
    this.endTouch = {
      normalized: { x: 0, y: 0 },
      raw: { x: 0, y: 0 },
    };

    this.touches = {};
    this.multitouch = false;

    this.mouseMovedStorage = null;
    this.mouseUpStorage = null;
    this.mouseDownStorage = null;
    this.mouseClickStorage = null;
    this.mouseDblClickStorage = null;
    this.wheelStorage = null;
    this.mousemovePackets = [];

    // Keyboard event buffers
    this.keyDownBuffer = [];
    this.keyUpBuffer = [];

    // fill dummy
    this.lastMouseDown = {
      normalized: { x: 0, y: 0 },
      raw: { x: 0, y: 0 },
    } as MouseEventData;

    globalThis.$mediator = this;
  }

  play = (): void => {
    if (this._isPlaying) {
      return;
    }

    this.addEvents();
    this.now = Date.now();

    if (FPS != null) {
      gsap.ticker.fps(FPS);
    }

    gsap.ticker.add(this.updateEvent);
    this._isPlaying = true;
    emitter.emit(EngineEvents.PLAY, null);
  };

  pause = (): void => {
    if (this._isPlaying == false) {
      return;
    }

    this.removeEvents();
    this._isPlaying = false;
    emitter.emit(EngineEvents.PAUSE, null);
  };

  update(force = false): void {
    let tempnow = Date.now();
    let delta = (tempnow - this.now) / 1000;

    if (force == true) {
      delta = 0;
    }

    this.now = tempnow;
    this.absTimer += delta;

    this.processInput();
    emitter.emit(EngineEvents.INPUT_PROCESS, delta, this.absTimer);

    // New event model: 6 clear phases
    // PHYSICS_UPDATE → UPDATE → LATE_UPDATE → PRE_RENDER → RENDER → POST_RENDER
    emitter.emit(EngineEvents.PHYSICS_UPDATE, delta, this.absTimer);
    emitter.emit(EngineEvents.AFTER_PHYSICS_UPDATE, delta, this.absTimer);

    emitter.emit(EngineEvents.UPDATE, delta, this.absTimer);
    emitter.emit(EngineEvents.LATE_UPDATE, delta, this.absTimer);
    emitter.emit(EngineEvents.PRE_RENDER, delta, this.absTimer);
    emitter.emit(EngineEvents.RENDER, delta, this.absTimer);
    emitter.emit(EngineEvents.POST_RENDER, delta, this.absTimer);
  }

  processInput() {
    // Process buffered keyboard events
    for (const ev of this.keyDownBuffer) {
      emitter.emit(EngineEvents.KEY_DOWN, ev);
    }
    this.keyDownBuffer = [];

    for (const ev of this.keyUpBuffer) {
      emitter.emit(EngineEvents.KEY_UP, ev);
    }
    this.keyUpBuffer = [];

    // Process mouse events
    if (this.mouseDownStorage != null) {
      emitter.emit(EngineEvents.MOUSE_DOWN, this.mouseDownStorage);
      this.mouseDownStorage = null;
    }

    if (this.mouseMovedStorage != null) {
      this.mouseMovedStorage.mousemovePackets = this.mousemovePackets;
      emitter.emit(EngineEvents.MOUSE_MOVE, this.mouseMovedStorage);
      this.mouseMovedStorage = null;
      this.mousemovePackets = [];
    }

    if (this.mouseUpStorage != null) {
      emitter.emit(EngineEvents.MOUSE_UP, this.mouseUpStorage);
      this.mouseUpStorage = null;
    }

    if (this.mouseClickStorage != null) {
      emitter.emit(EngineEvents.CLICK, this.mouseClickStorage);
      this.mouseClickStorage = null;
    }

    if (this.mouseDblClickStorage != null) {
      emitter.emit(EngineEvents.DBL_CLICK, this.mouseDblClickStorage);
      this.mouseDblClickStorage = null;
    }

    if (this.wheelStorage != null) {
      emitter.emit(EngineEvents.WHEEL, this.wheelStorage);
      this.wheelStorage = null;
    }
  }

  addEvents(): void {
    if (IS_TOUCH) {
      CANVAS.addEventListener(LOCAL_EVENTS.TOUCH_MOVE, this.mousemoveRef);
      CANVAS.addEventListener(LOCAL_EVENTS.TOUCH_START, this.mousedownRef);
      CANVAS.addEventListener(LOCAL_EVENTS.TOUCH_END, this.mouseupRef);
      CANVAS.addEventListener(LOCAL_EVENTS.TOUCH_CANCEL, this.mouseupRef);
    } else {
      window.addEventListener("mouseleave", this.mouseLeave.bind(this));
      CANVAS.addEventListener(EngineEvents.MOUSE_MOVE, this.mousemoveRef);
      CANVAS.addEventListener(EngineEvents.MOUSE_DOWN, this.mousedownRef);
      CANVAS.addEventListener(EngineEvents.MOUSE_UP, this.mouseupRef);
      window.addEventListener(EngineEvents.KEY_DOWN, this.keydownRef);
      window.addEventListener(EngineEvents.KEY_UP, this.keyupRef);
      CANVAS.addEventListener(EngineEvents.DBL_CLICK, this.dblClickRef);
      CANVAS.addEventListener(EngineEvents.WHEEL, this.mouseWheelRef, false);
      document.addEventListener(EngineEvents.POINTER_LOCK, this.pointerLockRef);
    }
  }

  removeEvents(): void {
    if (IS_TOUCH) {
      CANVAS.removeEventListener(EngineEvents.TOUCH_MOVE, this.mousemoveRef);
      CANVAS.removeEventListener(EngineEvents.TOUCH_START, this.mousedownRef);
      CANVAS.removeEventListener(EngineEvents.TOUCH_END, this.mouseupRef);
    } else {
      CANVAS.removeEventListener(EngineEvents.DBL_CLICK, this.dblClickRef);
      CANVAS.removeEventListener(EngineEvents.MOUSE_MOVE, this.mousemoveRef);
      CANVAS.removeEventListener(EngineEvents.MOUSE_DOWN, this.mousedownRef);
      CANVAS.removeEventListener(EngineEvents.MOUSE_UP, this.mouseupRef);
      window.removeEventListener(EngineEvents.KEY_DOWN, this.keydownRef);
      window.removeEventListener(EngineEvents.KEY_UP, this.keyupRef);
      CANVAS.removeEventListener(EngineEvents.WHEEL, this.mouseWheelRef);
      document.removeEventListener(
        EngineEvents.POINTER_LOCK,
        this.pointerLockRef,
      );
    }
  }

  mousedown = (e: MouseEvent | TouchEvent): void => {
    this.isDragging = true;

    // Request pointer lock synchronously within the user gesture callback
    // This must happen before the event is stored for async emission
    if (this._requestPointerLockOnClick && !IS_TOUCH && !IS_POINTER_LOCK()) {
      CANVAS?.requestPointerLock?.();
    }

    if ("changedTouches" in e && e.changedTouches) {
      e.preventDefault();

      for (let i = 0; i < e.changedTouches.length; i++) {
        let touch = e.changedTouches[i];
        this.touches[touch.identifier] = {
          startX: touch.clientX,
          startY: touch.clientY,
          clientX: touch.clientX,
          clientY: touch.clientY,
          dx: 0,
          dy: 0,
        };
      }
    }

    this.timeStampTap = Date.now();
    this.mouseDownStorage = this.getMouseData(e);
    this.lastMouseDown = this.getMouseData(e);
  };

  mouseLeave(e: MouseEvent): void {
    if (this.isDragging == true) {
      this.mouseup(e);
    }
    emitter.emit(EngineEvents.MOUSE_LEAVE, e);
  }

  mouseup(e: MouseEvent | TouchEvent): void {
    this.isDragging = false;

    if ("changedTouches" in e && e.changedTouches) {
      e.preventDefault();

      for (let i = 0; i < e.changedTouches.length; i++) {
        let touch = e.changedTouches[i];
        delete this.touches[touch.identifier];
      }

      if (e.targetTouches.length < 2) {
        this.multitouch = false;
      }
    }

    if (this.multitouch) return;

    this.mouseUpStorage = this.getMouseData(e);

    let distance: number | undefined;

    if ((e as unknown as VRInputEvent).isVR) {
      const vrUpStorage = this.mouseUpStorage as VREventData;
      const vrLastMouseDown = this.lastMouseDown as VREventData;
      pos1.setFromMatrixPosition(vrUpStorage.controller.matrixWorld);
      pos2.setFromMatrixPosition(vrLastMouseDown.controller.matrixWorld);

      if (pos1.distanceToSquared(pos2) < 0.1) {
        this.mouseClickStorage = this.mouseUpStorage;
      }
    } else {
      const mouseUpStorage = this.mouseUpStorage as MouseEventData;
      const lastMouseDown = this.lastMouseDown as MouseEventData;
      const a = mouseUpStorage.raw.x - lastMouseDown.raw.x;
      const b = mouseUpStorage.raw.y - lastMouseDown.raw.y;
      distance = Math.sqrt(a * a + b * b);
    }

    const dt = Date.now() - (this.timeStampTap ?? 0);

    if (distance !== undefined && distance < 10 && dt < 1000) {
      this.mouseClickStorage = this.getMouseData(e);
    }
  }

  click(e: MouseEvent): void {
    this.mouseClickStorage = this.getMouseData(e);
  }

  mousemove(ev: MouseEvent | TouchEvent): void {
    if ("changedTouches" in ev && ev.changedTouches) {
      for (let i = 0; i < ev.changedTouches.length; i++) {
        const touch = ev.changedTouches[i];
        let tcache = this.touches[touch.identifier];

        if (tcache) {
          tcache.dx = touch.clientX - tcache.clientX;
          tcache.dy = touch.clientY - tcache.clientY;
          tcache.clientX = touch.clientX;
          tcache.clientY = touch.clientY;
        }
      }

      if (this.multitouch) return;
    }

    let data = this.getMouseData(ev) as MouseEventData;

    if (!(ev as unknown as VRInputEvent).isVR) {
      const lastMouseDown = this.lastMouseDown as MouseEventData;
      data.origin = {
        normalized: lastMouseDown.normalized,
        raw: lastMouseDown.raw,
      };
    }

    this.mousemovePackets.push(data);
    this.mouseMovedStorage = data;
  }

  pointerLock(ev: Event): void {
    emitter.emit(EngineEvents.POINTER_LOCK, IS_POINTER_LOCK());
  }

  canHandleKeyEvent(ev: KeyboardEvent): boolean {
    return (
      ev.target === CANVAS ||
      ev.target === CANVAS.parentElement ||
      ev.target === document.body ||
      ev.target !== document.activeElement
    );
  }

  keydown(ev: KeyboardEvent): void {
    if (!this.canHandleKeyEvent(ev)) {
      return;
    }
    // Buffer keyboard events for synchronized processing
    this.keyDownBuffer.push(ev);
  }

  keyup(ev: KeyboardEvent): void {
    if (!this.canHandleKeyEvent(ev)) return;
    // Buffer keyboard events for synchronized processing
    this.keyUpBuffer.push(ev);
  }

  getMouseData(
    ev: MouseEvent | TouchEvent | VRInputEvent,
  ): MouseEventData | VREventData {
    if ((ev as VRInputEvent).isVR) {
      const vrEv = ev as VRInputEvent;
      return {
        isVR: true,
        isDragging: this.isDragging,
        controller: vrEv.controller,
        index: vrEv.index,
      };
    }

    let dx = 0;
    let dy = 0;
    let multitouch = false;
    let eventSource: MouseEvent | Touch = ev as MouseEvent;

    if ("changedTouches" in ev && ev.changedTouches && ev.changedTouches[0]) {
      if (ev.changedTouches.length > 1) {
        multitouch = true;
      }

      eventSource = ev.changedTouches[0];
      let tc = this.touches[eventSource.identifier];

      if (tc != null) {
        dx = tc.dx;
        dy = tc.dy;
      }
    } else {
      const mouseEv = ev as MouseEvent;
      dx = mouseEv.movementX ?? 0;
      dy = mouseEv.movementY ?? 0;
    }

    const rect = this.canvasBoundingRect;

    return {
      rawEvent: eventSource,
      multitouch: multitouch,
      isDragging: this.isDragging,
      time: Date.now(),
      normalized: {
        x: ((eventSource.clientX - rect.left) / rect.width) * 2 - 1,
        y: ((eventSource.clientY - rect.top) / rect.height) * 2 - 1,
      },
      raw: {
        x: eventSource.clientX,
        y: eventSource.clientY,
        dx,
        dy,
        screenX: eventSource.screenX,
        screenY: eventSource.screenY,
        ctrlKey: (ev as MouseEvent).ctrlKey ?? false,
        shiftKey: (ev as MouseEvent).shiftKey ?? false,
        metaKey: (ev as MouseEvent).metaKey ?? false,
        button: (eventSource as MouseEvent).button ?? 0,
      },
    };
  }

  dblClick(e: MouseEvent): void {
    e.preventDefault();
    this.mouseDblClickStorage = this.getMouseData(e) as MouseEventData;
  }

  mouseWheel(e: WheelEvent): void {
    this.wheelStorage = e;
  }

  resize(opts?: ResizeOptions): void {
    if (opts == null || (!opts.w && !opts.h)) {
      opts = {
        w: this.lastW,
        h: this.lastH,
        ...opts,
      };
    }

    this.w = opts.w!;
    this.h = opts.h!;
    this.fullFrameX = opts.w!;
    this.fullFrameY = opts.h!;

    if (opts.force == null || opts.force == false) {
      this.lastW = opts.w!;
      this.lastH = opts.h!;

      let { width, height } = resizer(
        this.fullFrameX * DPI,
        this.fullFrameY * DPI,
      );

      this.w = Math.round(width / DPI);
      this.h = Math.round(height / DPI);
    }

    // Seems the canvas bounds are not yet updated to their new values on this event
    setTimeout(() => {
      this.updateCanvasBounds();
    });

    SET_VIEW(this.w, this.h);
    SET_REAL_VIEW(this.fullFrameX, this.fullFrameY);
    SET_ORIENTATION(
      window.matchMedia("(orientation: landscape)").matches
        ? LANDSCAPE
        : PORTRAIT,
    );

    emitter.emit(EngineEvents.RESIZE, this.w, this.h);

    if (CANVAS != null) {
      CANVAS.style.width = `${this.fullFrameX}px`;
      CANVAS.style.height = `${this.fullFrameY}px`;
    }

    SET_REAL_DPI(parseFloat(((this.w / this.fullFrameX) * DPI).toFixed(3)));

    if (this._isPlaying == false) {
      this.update(true);
    }
  }

  updateCanvasBounds(): void {
    const rect = CANVAS.getBoundingClientRect();
    this.canvasBoundingRect.left = rect.left;
    this.canvasBoundingRect.top = rect.top;
    this.canvasBoundingRect.width = rect.width;
    this.canvasBoundingRect.height = rect.height;
  }

  /**
   * Sets whether pointer lock should be requested synchronously on canvas click.
   * This is needed because requestPointerLock() must be called within a user gesture callback.
   */
  set requestPointerLockOnClick(val: boolean) {
    this._requestPointerLockOnClick = val;
  }

  get requestPointerLockOnClick(): boolean {
    return this._requestPointerLockOnClick;
  }
}

const mediatorInstance = new Mediator();
export default mediatorInstance;
