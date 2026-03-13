import * as THREE from "three";

import emitter from "../engine-emitter";

import Renderer from "../renderer";
import { VIEW } from "../constants";

import Mix from "../utils/math/mix";

import { DPI } from "../constants";

const FREE_LOCK = "FREE";

export default class WindowRenderer {
  constructor(fbo) {
    this.fbo = fbo;
    this.renderer = Renderer;
    this.autoUpdate = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.000001, 1000);

    this.lockMode = {
      x: 0,
      y: 1,
    };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.offset = {
      x: 0,
      y: 0,
    };

    this.offsetRatio = {
      x: 0,
      y: 0,
    };

    this.attach(fbo);

    this.setSize(VIEW.w, VIEW.h);

    this.setMode(this.lockMode);
  }

  setMode(mode) {
    if (mode == FREE_LOCK && this.lockMode != FREE_LOCK) {
      this.addEvents();
    } else {
      this.removeEvents();
    }

    this.lockMode = mode;

    this.setViewOffset(this.offset);
  }

  setViewOffset(offset) {
    if (this.lockMode == FREE_LOCK) {
      offset.x = Math.max(
        Math.min(offset.x, VIEW.w * 0.5 - this.quad.scale.x * 0.5),
        -VIEW.w * 0.5 + this.quad.scale.x * 0.5
      );

      offset.y = Math.max(
        Math.min(offset.y, VIEW.h * 0.5 - this.quad.scale.y * 0.5),
        -VIEW.h * 0.5 + this.quad.scale.y * 0.5
      );
    } else {
      // lock mode can be bewteen 0 and 1, set the offset in between  VIEW.w * 0.5 - this.quad.scale.x * 0.5 and -VIEW.w * 0.5 + this.quad.scale.x * 0.5

      offset.x = Mix(
        VIEW.w * 0.5 - this.quad.scale.x * 0.5,
        -VIEW.w * 0.5 + this.quad.scale.x * 0.5,
        this.lockMode.x
      );

      offset.y = Mix(
        VIEW.h * 0.5 - this.quad.scale.y * 0.5,
        -VIEW.h * 0.5 + this.quad.scale.y * 0.5,
        this.lockMode.y
      );
    }

    this.camera.setViewOffset(
      VIEW.w,
      VIEW.h,
      offset.x,
      -offset.y,
      VIEW.w,
      VIEW.h
    );
  }

  performMouseDown(e) {
    this.mouse.x =
      (e.rawEvent.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
    this.mouse.y =
      -(e.rawEvent.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.scene, true);

    return intersects.length > 0;
  }

  attach() {
    if (this.quad == null) {
      const material = new THREE.MeshBasicMaterial({
        map: this.fbo.texture == null ? this.fbo : this.fbo.texture,
        side: THREE.DoubleSide,
      });

      this.quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      this.quad.visible = true;

      this.scene.add(this.quad);
    }

    const width = this.fbo.width / DPI;
    const height = this.fbo.height / DPI;

    this.quad.width = width;
    this.quad.height = height;
    this.quad.scale.set(width, height, 1);

    this.quad.material.map =
      this.fbo.texture == null ? this.fbo : this.fbo.texture;
  }

  refresh(renderTarget) {
    this.fbo = renderTarget;
    this.attach();
    this.setViewOffset(this.offset);
  }

  mouseDown(e) {
    const raycasted = this.performMouseDown(e);

    if (raycasted) {
      e.rawEvent.preventDefault();

      this.dragging = true;
      this.mouseStart.x = e.rawEvent.clientX;
      this.mouseStart.y = e.rawEvent.clientY;
      this.offsetStart.x = this.offset.x;
    }
  }

  mouseMove(e) {
    if (this.dragging) {
      e.rawEvent.preventDefault();

      this.offset.x = -(
        this.offsetStart.x +
        (e.rawEvent.clientX - this.mouseStart.x)
      );
      this.offset.y =
        this.offsetStart.y + (e.rawEvent.clientY - this.mouseStart.y);

      this.setViewOffset(this.offset);
    }
  }

  mouseUp(e) {
    this.dragging = false;
  }

  mouseLeave(e) {
    this.dragging = false;
  }

  addEvents() {
    this.dragging = false;

    this.mouseStart = { x: 0, y: 0 };

    this.offsetStart = { x: 0, y: 0 };

    if (this.mouseDownEvent == null) {
      this.mouseDownEvent = this.mouseDown.bind(this);

      this.mouseMoveEvent = this.mouseMove.bind(this);

      this.mouseUpEvent = this.mouseUp.bind(this);

      this.mouseLeaveEvent = this.mouseLeave.bind(this);

      emitter.on(EngineEvents.MOUSE_DOWN, this.mouseDownEvent);

      emitter.on(EngineEvents.MOUSE_MOVE, this.mouseMoveEvent);

      emitter.on(EngineEvents.MOUSE_UP, this.mouseUpEvent);

      emitter.on(EngineEvents.MOUSE_LEAVE, this.mouseLeaveEvent);
    }
  }

  removeEvents() {
    if (this.mouseDownEvent != null) {
      emitter.off(EngineEvents.MOUSE_DOWN, this.mouseDownEvent);
      emitter.off(EngineEvents.MOUSE_MOVE, this.mouseMoveEvent);
      emitter.off(EngineEvents.MOUSE_UP, this.mouseUpEvent);
      emitter.off(EngineEvents.MOUSE_LEAVE, this.mouseLeaveEvent);

      this.mouseDownEvent = null;
      this.mouseMoveEvent = null;
      this.mouseUpEvent = null;
      this.mouseLeaveEvent = null;
    }
  }

  setSize(w, h) {
    this.camera.left = w / -2;
    this.camera.right = w / 2;
    this.camera.top = h / 2;
    this.camera.bottom = h / -2;

    this.camera.updateProjectionMatrix();

    this.setViewOffset(this.offset);
  }

  update() {
    let oldTarget = this.renderer.getRenderTarget();

    this.renderer.setRenderTarget(null);

    const oldAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    this.renderer.render(this.scene, this.camera);
    this.renderer.autoClear = oldAutoClear;

    this.renderer.setRenderTarget(oldTarget);
  }

  dispose() {
    this.removeEvents();

    if (this.quad) {
      this.quad.geometry.dispose();

      this.quad.material.dispose();

      this.quad = null;
    }

    this.camera = null;

    this.scene = null;

    this.raycaster = null;
  }
}
