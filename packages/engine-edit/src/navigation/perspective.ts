// @ts-check

import CameraControls from "../utils/camera-controls";

import * as THREE from "three";

import { CANVAS, IS_MOBILE } from "@oncyberio/engine/internal/constants";

import conf from "@oncyberio/engine/internal/utils/params";

import emitter from "@oncyberio/engine/internal/engine-emitter";
import { EngineEvents } from "@oncyberio/engine/internal/engine-events";

import Events from "../editor-events";

import { Euler, Spherical, Vector3 } from "three";

import { isInFrustum, lookAtDistance } from "../utils/three";
import { FocusOpts } from "./types";
import type { Space } from "@oncyberio/engine/index";
import { NavView } from "../types";

const obj = new THREE.PerspectiveCamera();
obj.rotation.order = "YXZ";

const UP_VECTOR = new Vector3(0, 1, 0);

export function getEulerFromLookat(position, target) {
  obj.position.copy(position);
  obj.rotation.set(0, 0, 0);
  obj.lookAt(target);
  return obj.rotation.clone();
}

CameraControls.install({ THREE: THREE });

window["$CameraControls"] = CameraControls;

const TARGET = new Vector3(
  -10.502310085718126,
  0.581587538499533,
  0.7745837808404059,
);

const zoomOutPos = new Vector3(-300, 90, 100);

const USER_HEIGHT = 2.8;
const EPS = 1e-5;

interface ToggleMapViewOpts {
  enabled: boolean;
  target?: THREE.Object3D;
  frontDir?: boolean;
}

interface TargetState {
  position?: Vector3;
  rotation?: Euler | Vector3;
}

const tempObj = new THREE.Object3D();

export class PerspectiveControls {
  isMapView = false;
  keyStates = {};
  cameraControls: CameraControls;
  _enabled = false;
  point = null;
  isDragging = false;
  touchTimeout = null;
  prevClickTime = 0;
  _playerSpeed = 10;

  _fastMode = false;
  _chunkMode = false;
  _hud: HTMLDivElement | null = null;
  _coordsEl: HTMLDivElement | null = null;
  _notifyEl: HTMLDivElement | null = null;
  _notifyTimeout: any = null;
  _currentChunkKey: string | null = null;
  _chunkReady = false;

  static CHUNK_SIZE = 10_000;

  static posToChunkKey(pos: { x: number; y: number; z: number }): string {
    const s = PerspectiveControls.CHUNK_SIZE;
    const h = s / 2;
    return `${Math.floor((pos.x + h) / s)}_${Math.floor((pos.y + h) / s)}_${Math.floor((pos.z + h) / s)}`;
  }

  constructor(
    public opts: { camera: THREE.PerspectiveCamera; cameraOffset: Vector3 },
  ) {
    opts.camera.position.set(0, USER_HEIGHT, EPS);
    this.createCameraControls();
  }

  createCameraControls() {
    this.cameraControls = new CameraControls(this.opts.camera, CANVAS);
    (window as any).ccc = this.cameraControls;

    this.cameraControls.enabled = false;
    this.cameraControls.mouseButtons.left = CameraControls.ACTION.ROTATE;
    this.cameraControls.mouseButtons.wheel = CameraControls.ACTION.DOLLY;
    this.cameraControls.mouseButtons.right = CameraControls.ACTION.TRUCK;
    this.cameraControls.mouseButtons.middle = CameraControls.ACTION.NONE;
    this.cameraControls.touches.one = CameraControls.ACTION.TOUCH_ROTATE;
    this.cameraControls.touches.two = CameraControls.ACTION.TOUCH_TRUCK;

    const panSpeed = +conf.panSpeed || 20;
    const zoomSpeed = +conf.zoomSpeed || 8;

    this.cameraControls.truckSpeed = panSpeed;
    this.cameraControls.dollySpeed = zoomSpeed / 10;
    this.cameraControls.dollySpeedIn = zoomSpeed;
    this.cameraControls.minDistance = 10;
    this.cameraControls.maxDistance = 20;
    this.cameraControls.dollyToCursor = true;
    this.cameraControls.infinityDolly = true;
    this.cameraControls.azimuthRotateSpeed = -0.5;
    this.cameraControls.polarRotateSpeed = -0.1;

    this.initCameraCoords();
    emitter.once(Events.GAME_SPACE_LOADED, this.initCameraCoords);
    this.cameraControls.addEventListener("controlstart", this.onControlStart);
    this.cameraControls.addEventListener("control", this.onControl);
    (window as any).$cc = this.cameraControls;
  }

  private _xInput: HTMLInputElement | null = null;
  private _yInput: HTMLInputElement | null = null;
  private _zInput: HTMLInputElement | null = null;
  private _infoEl: HTMLSpanElement | null = null;

  // ── HUD ──

  private _createHUD() {
    if (this._hud) return;
    this._hud = document.createElement("div");
    this._hud.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;font-family:monospace;";

    this._coordsEl = document.createElement("div");
    this._coordsEl.style.cssText = "position:fixed;top:0;left:160px;height:64px;display:flex;align-items:center;gap:4px;color:white;font-size:12px;text-shadow:0 1px 3px rgba(0,0,0,0.8);opacity:0.6;z-index:101;";

    this._xInput = this._createCoordInput("X", "#f55");
    this._yInput = this._createCoordInput("Y", "#5f5");
    this._zInput = this._createCoordInput("Z", "#55f");

    this._infoEl = document.createElement("span");
    this._coordsEl.appendChild(this._infoEl);

    this._hud.appendChild(this._coordsEl);

    this._notifyEl = document.createElement("div");
    this._notifyEl.style.cssText = "position:absolute;top:25%;left:50%;transform:translateX(-50%);color:white;font-size:18px;font-weight:700;text-shadow:0 2px 6px rgba(0,0,0,0.9);opacity:0;transition:opacity 0.3s;";
    this._hud.appendChild(this._notifyEl);

    document.body.appendChild(this._hud);
  }

  private _createCoordInput(label: string, color: string): HTMLInputElement {
    const wrap = document.createElement("span");
    wrap.style.cssText = "display:flex;align-items:center;gap:2px;pointer-events:auto;";

    const lbl = document.createElement("span");
    lbl.textContent = label + ":";
    lbl.style.cssText = `color:${color};font-weight:600;`;
    wrap.appendChild(lbl);

    const input = document.createElement("input");
    input.type = "text";
    input.style.cssText = "width:60px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.15);border-radius:3px;color:white;font-family:monospace;font-size:12px;padding:1px 4px;text-align:right;outline:none;pointer-events:auto;";
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter" || e.key === "Tab") {
        const val = parseFloat(input.value);
        if (isNaN(val)) return;
        const axis = label.toLowerCase() as "x" | "y" | "z";
        const cam = this.opts.camera;
        const target = this.cameraControls.getTarget(new Vector3());
        const delta = val - cam.position[axis];
        cam.position[axis] = val;
        target[axis] += delta;
        this.cameraControls.setLookAt(
          cam.position.x, cam.position.y, cam.position.z,
          target.x, target.y, target.z,
          false,
        );
        this.cameraControls.update(0);
        if (e.key === "Enter") input.blur();
      }
    });
    input.addEventListener("keyup", (e) => {
      e.stopPropagation();
    });
    input.addEventListener("focus", () => {
      input.style.borderColor = "rgba(255,255,255,0.4)";
    });
    input.addEventListener("blur", () => {
      input.style.borderColor = "rgba(255,255,255,0.15)";
    });
    wrap.appendChild(input);

    this._coordsEl.appendChild(wrap);
    return input;
  }

  private _removeHUD() {
    if (this._hud) {
      this._hud.remove();
      this._hud = null;
      this._coordsEl = null;
      this._xInput = null;
      this._yInput = null;
      this._zInput = null;
      this._infoEl = null;
      this._notifyEl = null;
    }
  }

  private _updateCoords() {
    if (!this._coordsEl) return;
    const cam = this.opts.camera;
    const p = cam.position;

    // Update inputs only when not focused
    if (this._xInput && document.activeElement !== this._xInput) {
      this._xInput.value = p.x.toFixed(1);
    }
    if (this._yInput && document.activeElement !== this._yInput) {
      this._yInput.value = p.y.toFixed(1);
    }
    if (this._zInput && document.activeElement !== this._zInput) {
      this._zInput.value = p.z.toFixed(1);
    }

    // Get camera forward direction for compass
    const dir = new Vector3();
    cam.getWorldDirection(dir);

    const yawRad = Math.atan2(dir.x, -dir.z);
    const yawDeg = THREE.MathUtils.radToDeg(yawRad);

    const pitchRad = Math.asin(Math.max(-1, Math.min(1, dir.y)));
    const pitchDeg = THREE.MathUtils.radToDeg(pitchRad);

    let bearing = ((yawDeg % 360) + 360) % 360;
    const compass = this._bearingToCompass(bearing);

    if (this._infoEl) {
      this._infoEl.textContent =
        `  │  Yaw: ${yawDeg.toFixed(1)}°  Pitch: ${pitchDeg.toFixed(1)}°` +
        `  │  ${compass} (${bearing.toFixed(0)}°)` +
        `  │  Chunk: ${this._currentChunkKey ?? "—"}`;
    }
  }

  private _bearingToCompass(bearing: number): string {
    // N=0, NE=45, E=90, SE=135, S=180, SW=225, W=270, NW=315
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const idx = Math.round(bearing / 45) % 8;
    return dirs[idx];
  }

  private _showNotify(text: string) {
    if (!this._notifyEl) return;
    clearTimeout(this._notifyTimeout);
    this._notifyEl.textContent = text;
    this._notifyEl.style.opacity = "1";
    this._notifyTimeout = setTimeout(() => {
      if (this._notifyEl) this._notifyEl.style.opacity = "0";
    }, 2000);
  }

  private _toggleFastMode() {
    this._fastMode = !this._fastMode;
    this._showNotify(this._fastMode ? "FAST MODE ON" : "FAST MODE OFF");
  }

  private _checkChunkBoundary() {
    if (!this._chunkReady) return;
    const p = this.opts.camera.position;
    const key = PerspectiveControls.posToChunkKey(p);
    if (key !== this._currentChunkKey) {
      this._currentChunkKey = key;
      emitter.emit(Events.CHUNK_CHANGED, { chunkKey: key });
      this._showNotify(`CHUNK: ${key}`);
    }
  }

  // ── Events ──

  private onControlStart = (event) => {
    emitter.emit(Events.CAMERA_CONTROLS_START, event);
  };

  private onControl = (event) => {
    emitter.emit(Events.CAMERA_CONTROL, event);
  };

  private initCameraCoords = (opts?: { space: Space }) => {
    let pos = new Vector3(0, USER_HEIGHT, 0);
    let rotation = new Euler(0, 0, 0, "YXZ");

    if (opts?.space) {
      const player = opts.space.components.find(
        (c) => c.data.script?._isPlayer,
      );
      if (player != null) {
        tempObj.position.copy(player.position);
        tempObj.quaternion.copy(player.quaternion);
        tempObj
          .translateY(USER_HEIGHT + (this.opts.cameraOffset?.y ?? 0))
          .translateX(this.opts.cameraOffset?.x ?? 0)
          .translateZ(this.opts.cameraOffset?.z ?? 10);
        pos.copy(tempObj.position);
      }
    }

    this.setCoords(pos, rotation);
    this.cameraControls.saveState();
    this.cameraControls.update(0);
  };

  enableMouse() { this.cameraControls.enabledMouse = true; }
  disableMouse() { this.cameraControls.enabledMouse = false; }

  activate() {
    this._enabled = true;
    this.cameraControls.enabled = true;
    this._createHUD();
    this._chunkReady = false;
    setTimeout(() => { this._chunkReady = true; }, 3000);

    emitter.on(Events.LATE_UPDATE, this.update);
    emitter.on(EngineEvents.MOUSE_DOWN, this.mouseDown);
    emitter.on(EngineEvents.MOUSE_MOVE, this.mouseMove);
    emitter.on(EngineEvents.MOUSE_UP, this.mouseUp);
    emitter.on(EngineEvents.KEY_DOWN, this.handleKeyDown);
    emitter.on(EngineEvents.KEY_UP, this.handleKeyUp);
  }

  deactivate() {
    this._enabled = false;
    this.cameraControls.enabled = false;
    this._removeHUD();

    emitter.off(Events.LATE_UPDATE, this.update);
    emitter.off(EngineEvents.MOUSE_DOWN, this.mouseDown);
    emitter.off(EngineEvents.MOUSE_MOVE, this.mouseMove);
    emitter.off(EngineEvents.MOUSE_UP, this.mouseUp);
    emitter.off(EngineEvents.KEY_DOWN, this.handleKeyDown);
    emitter.off(EngineEvents.KEY_UP, this.handleKeyUp);
  }

  // ── Camera positioning ──

  tmpPos = new Vector3();
  tmpLookat = new Vector3();
  tmpEuler = new Euler(0, 0, 0, "YXZ");
  sph = new Spherical();

  async setCoords(pos: Vector3, rot: Euler | Vector3, transition = false) {
    this.tmpPos.copy(pos);
    if (rot instanceof Euler) {
      this.tmpEuler.copy(rot);
      this.tmpLookat.set(0, 0, -1).applyEuler(this.tmpEuler).add(this.tmpPos);
    } else {
      this.tmpLookat.set(rot.x, rot.y, rot.z);
    }
    await this.cameraControls.setLookAt(
      this.tmpPos.x, this.tmpPos.y, this.tmpPos.z,
      this.tmpLookat.x, this.tmpLookat.y, this.tmpLookat.z,
      transition,
    );
    if (!transition) this.cameraControls.update(0);
  }

  _viewPos = new Vector3();
  _viewLookat = new Vector3();

  setNavView(
    view: NavView,
    opts: { transition?: boolean; target?: THREE.Object3D; distance?: number; centerOfBounds?: boolean; } = {},
  ) {
    let distance = opts.distance;
    let target: Vector3 = null;

    if (opts.target) {
      target = opts.target.getWorldPosition(new Vector3());
      var bbox = (opts.target as any).getRawBBox?.() ?? (opts.target as any).getBBox?.();
      if (bbox != null) {
        if ((opts.target as any).getRawBBox) {
          target.y += (bbox.min.y + bbox.max.y) * 0.5;
          target.x += (bbox.min.x + bbox.max.x) * 0.5;
          target.z += (bbox.min.z + bbox.max.z) * 0.5;
        }
      } else {
        bbox = new THREE.Box3().setFromObject(opts.target);
      }
      if (!distance) {
        distance = Math.min(this.getBestFitCameraZ(bbox), 100);
      }
    }

    if (target == null) {
      target = this.cameraControls.getTarget(this._viewLookat);
      if (view !== "Y" && view !== "-Y") { target.setY(this.cameraControls.camera.position.y); }
      else { target.setY(0); }
    }

    if (!distance) distance = 20;

    if (view === "X" || view === "-X") {
      const inv = view === "-X" ? -1 : 1;
      this._viewPos.set(inv * distance, 0, 0).add(target);
    } else if (view === "Y" || view === "-Y") {
      const inv = view === "-Y" ? -1 : 1;
      this._viewPos.set(0, inv * distance, 0).add(target);
    } else if (view === "Z" || view === "-Z") {
      const inv = view === "-Z" ? -1 : 1;
      this._viewPos.set(0, 0, inv * distance).add(target);
    }

    const euler = getEulerFromLookat(this._viewPos, target);
    this.setCoords(this._viewPos, euler, opts.transition);
    return target;
  }

  private _applyState(state, transition) {
    return this.setCoords(state.position, state.rotation, transition);
  }

  async toggleMapView(opts: ToggleMapViewOpts, transition = false) {
    if (this.isMapView == opts.enabled) return;
    this.isMapView = opts.enabled;
    let smoothTime = this.cameraControls.smoothTime;
    try {
      this.cameraControls.smoothTime = 0.1;
      await this._toggleMapView(opts, transition);
    } finally {
      this.cameraControls.smoothTime = smoothTime;
    }
  }

  private async _toggleMapView(opts: ToggleMapViewOpts, transition = false) {
    const { enabled, target, frontDir = false } = opts;
    const camera = this.opts.camera;

    if (target) {
      await this.setTarget(
        { target: target as THREE.Mesh, transition, frontDir },
        { position: enabled ? zoomOutPos.clone() : camera.position.clone() },
      );
      return;
    }

    if (enabled) {
      await Promise.all([
        this.cameraControls.moveTo(zoomOutPos.x, zoomOutPos.y, zoomOutPos.z, transition),
        this.cameraControls.setTarget(TARGET.x, TARGET.y, TARGET.z, transition),
      ]);
    } else {
      await Promise.all([
        this.cameraControls.setTarget(TARGET.x, TARGET.y, TARGET.z, transition),
        this.cameraControls.dollyTo(USER_HEIGHT, transition),
      ]);
    }

    if (!transition) this.cameraControls.update(0);
  }

  focusOn(opts: FocusOpts) { return this.setTarget(opts); }

  async setTarget(
    { target, transition = true, frontDir = false }: FocusOpts,
    state: TargetState = {},
  ) {
    target.updateWorldMatrix(true, true);
    const camera = this.opts.camera;
    const bbox = new THREE.Box3().setFromObject(target);
    const targetPos = target.getWorldPosition(new Vector3());
    targetPos.y = bbox.min.y + (bbox.max.y - bbox.min.y) * 0.5;

    if (this.isMapView) {
      state.position ??= camera.position.clone();
      state.rotation = targetPos;
      await this._applyState(state, transition);
    } else {
      const dist = Math.max(lookAtDistance(target, camera), 4.5);
      if (dist > 200) {
        await Promise.all([
          this.cameraControls.setTarget(TARGET.x, TARGET.y, TARGET.z, transition),
          this.cameraControls.dollyTo(USER_HEIGHT, transition),
        ]);
        return;
      }

      const isVisible = isInFrustum(bbox, camera);
      let position;

      if (frontDir) {
        const dir = target.getWorldDirection(new Vector3());
        if (Math.abs(dir.dot(UP_VECTOR)) < 0.9) {
          position = targetPos.clone().add(dir.multiplyScalar(dist));
        }
      }

      if (position == null) {
        const cameraZ = this.getBestFitCameraZ(bbox);
        if (isVisible) {
          position = camera.position.clone().sub(targetPos).setY(targetPos.y).normalize()
            .multiplyScalar(cameraZ).add(targetPos).setY((bbox.min.y + bbox.max.y) * 0.5 + 1);
        } else {
          position = new Vector3(0, 0, 1).multiplyScalar(cameraZ).add(targetPos)
            .setY((bbox.min.y + bbox.max.y) * 0.5 + 1);
        }
      }

      state.position = position;
      state.rotation = getEulerFromLookat(position, targetPos);
      await this._applyState(state, transition);
    }
  }

  getBestFitCameraZ(bbox: THREE.Box3) {
    const camera = this.opts.camera;
    const size = bbox.getSize(new Vector3());
    const fov = (camera.fov - 20) * (Math.PI / 180);
    const fovh = 2 * Math.atan(Math.tan(fov / 2) * camera.aspect);
    let dx = size.z / 2 + Math.abs(size.x / 2 / Math.tan(fovh / 2));
    let dy = size.z / 2 + Math.abs(size.y / 2 / Math.tan(fov / 2));
    return Math.max(dx, dy) + 4;
  }

  goto(position: Vector3, rotationOrDir?: Euler | Vector3) {
    const camera = this.cameraControls.camera;
    camera.position.copy(position);
    if (rotationOrDir instanceof Euler) { camera.rotation.copy(rotationOrDir); }
    else if (rotationOrDir instanceof Vector3) { camera.lookAt(rotationOrDir); }
    this.setCoords(camera.position, camera.rotation);
  }

  // ── Input ──

  handleKeyDown = (event) => {
    if (event.ctrlKey || event.metaKey) return;
    emitter.emit(Events.CAMERA_CONTROLS_START, event);

    if (event.source === "joystick") {
      this.keyStates["KeyW"] = false;
      this.keyStates["KeyS"] = false;
      this.keyStates["KeyA"] = false;
      this.keyStates["KeyD"] = false;
      if (event.code) this.keyStates[event.code] = true;
      return;
    }

    // J toggles fast mode
    if (event.code === "KeyJ") {
      this._toggleFastMode();
      return;
    }

    this.keyStates[event.code] = true;
  };

  handleKeyUp = (event) => {
    if (event.ctrlKey || event.metaKey) return;
    if (event.code === "KeyJ") return; // toggle, not hold
    this.keyStates[event.code] = false;
  };

  reset = () => {
    this.keyStates = {};
  };

  controls(delta) {
    if (this.keyStates["KeyW"] || this.keyStates["ArrowUp"]) {
      this.moveForward(delta);
    }
    if (this.keyStates["KeyS"] || this.keyStates["ArrowDown"]) {
      this.moveBackward(delta);
    }
    if (this.keyStates["KeyA"] || this.keyStates["ArrowLeft"]) {
      this.moveLeft(delta);
    }
    if (this.keyStates["KeyD"] || this.keyStates["ArrowRight"]) {
      this.moveRight(delta);
    }
    if (this.keyStates["Space"]) {
      this.moveUp(delta);
    }
    if (this.keyStates["KeyB"] || this.keyStates["ShiftLeft"] || this.keyStates["ShiftRight"]) {
      this.moveDown(delta);
    }
  }

  update = (delta) => {
    this.controls(delta);
    this.cameraControls.camera.getWorldDirection(this.tmpLookat);
    this.cameraControls.update(delta);
    this._updateCoords();
    this._checkChunkBoundary();
  };

  // ── Touch ──

  touchStart = (e) => {
    if (!IS_MOBILE) return;
    if (this.touchTimeout) clearTimeout(this.touchTimeout);
    if (Date.now() - this.prevClickTime < 300) {
      this.touchTimeout = setTimeout(() => { this.keyStates["KeyB"] = true; }, 300);
      return;
    }
    this.prevClickTime = Date.now();
    this.touchTimeout = setTimeout(() => { this.keyStates["Space"] = true; }, 300);
  };

  touchEnd = (e) => {
    if (!IS_MOBILE) return;
    if (this.touchTimeout) clearTimeout(this.touchTimeout);
    this.keyStates["Space"] = false;
    this.keyStates["KeyB"] = false;
  };

  mouseDown = (e) => { this.touchStart(e); };

  mouseMove = (e) => {
    this.touchEnd(e);
    this.isDragging = true;
  };

  mouseDownEvent = null;

  mouseUp = (e) => {
    if (!this.mouseDownEvent) return;
    this.touchEnd(e);
    this.mouseDownEvent = null;
    if (this.isDragging) { this.isDragging = false; return; }
    if (this.point) {
      this.cameraControls.dollyTo(0.00001, true);
      this.cameraControls.moveTo(this.point.x, this.point.y + USER_HEIGHT, this.point.z, true);
    }
  };

  // ── Movement ──

  get playerSpeed() {
    return (
      this._playerSpeed *
      (this.isMapView ? 10 : 1) *
      (this._fastMode ? 100 : 1)
    );
  }

  moveLeft = (delta) => { this.cameraControls.truck(-this.playerSpeed * delta, 0, false); };
  moveRight = (delta) => { this.cameraControls.truck(this.playerSpeed * delta, 0, false); };
  moveForward = (delta) => { this.cameraControls.forward(this.playerSpeed * delta, false); };
  moveBackward = (delta) => { this.cameraControls.forward(-this.playerSpeed * delta, false); };
  moveUp = (delta) => { this.cameraControls.truck(0, -this.playerSpeed * delta, false); };
  moveDown = (delta) => { this.cameraControls.truck(0, this.playerSpeed * delta, false); };

  rotateAzimuth(angle) { this.cameraControls.rotateAzimuthTo(angle, true); }

  dispose = () => {
    this.deactivate();
    this.point = null;
  };
}
