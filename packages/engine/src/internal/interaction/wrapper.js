/**
 * Represents an InteractionWrapper class.
 */

import Camera from "../../camera";
import {
  Vector2,
  Mesh,
  BoxGeometry,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} from "three";
import emitter from "../engine-emitter";
import { EngineEvents } from "../engine-events";
import { IS_MOBILE, CANVAS } from "../constants";

const defaultIndex = "key_command";
export default class InteractionWrapper {
  /**
   * Creates an instance of InteractionWrapper.
   * @param {Object} mesh - The mesh object.
   * @param {Object} data - The data object.
   * @param {Object} json - The JSON object.
   */
  constructor(mesh, data, json) {
    /**
     * The interaction distance.
     * @type {number}
     */
    this.interactionDistance = data.distance;

    /**
     * The distance target.
     * @type {Object}
     */
    this.distanceTarget = data.distanceTarget;

    /**
     * @internal
     */
    this._currentAtlas = defaultIndex;

    /**
     * @internal
     */
    this._mouse = new Vector2();

    /**
     * @internal
     */
    this._raycaster = new Raycaster();

    /**
     * @internal
     */
    this.mesh = mesh;

    /**
     * @internal
     */

    this.instance = mesh.add(data);

    /**
     * The visibility status.
     * @type {boolean}
     */
    this.visible = false;

    /**
     * @internal
     */
    this.json = json;

    /**
     * The key.
     * @type {string}
     */
    this.key = data.key;

    /**
     * @internal
     */
    this.callback = null;

    /**
     * @internal
     */
    this.enterCallback = null;

    /**
     * @internal
     */
    this.exitCallback = null;

    /**
     * The active status.
     * @type {boolean}
     */
    this.active = true;

    /**
     * @internal
     */
    this.frames = this.processFrames(this.json.frames);

    /**
     * @internal
     */
    this.maxW = this.json.meta.size.w;

    /**
     * @internal
     */
    this.maxH = this.json.meta.size.h;

    /**
     * The atlas.
     * @type {string}
     */
    if (data.atlas) {
      this.atlas = data.atlas;
    } else {
      this.atlas = defaultIndex;
    }

    this.instance.opacity = data.opacity || 1;

    if (!data?.manualUpdate) {
      this.addEvents();
    }

    //
    if (IS_MOBILE) {
      this._mobileRaycastMesh = new Mesh(
        new BoxGeometry(2, 2, 2),
        new MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          side: 2,
        })
      );

      this._mobileRaycastMesh.visible = false;
    }
  }

  /**
   * Sets the distance target.
   * @param {Object} val - The distance target value.
   */
  set distanceTarget(val) {
    if (val == null) {
      val = Camera.current.position;
    }
    this._distanceTarget = val;
  }

  /**
   * Gets the distance target.
   * @returns {Object} - The distance target.
   */
  get distanceTarget() {
    return this._distanceTarget;
  }

  /**
   * Sets the atlas.
   * @param {string} val - The atlas value.
   */
  set atlas(val) {
    if (this.frames[val] == null) {
      if (IS_MOBILE) {
        val = "tap-outline";
      } else {
        console.error("atlas not found", val);
      }
    }

    this._currentAtlas = val;
    const frame = this.frames[val].frame;

    const aspectRatio =
      this.frames[val].sourceSize.w / this.frames[val].sourceSize.h;

    this.aspectRatioDisplay = aspectRatio;

    this.uvsOffset = { x: frame.x / this.maxW, y: frame.y / this.maxH };
    this.uvMultiply = {
      x: frame.w / this.maxW,
      y: frame.h / this.maxH,
    };
    this.instance.atlas = {
      x: this.uvsOffset.x,
      y: this.uvsOffset.y,
      z: this.uvMultiply.x,
      w: this.uvMultiply.y,
    };
  }

  set aspectRatioDisplay(val) {
    this.instance.aspectRatioDisplay = val;
  }

  get aspectRatioDisplay() {
    return this.instance.aspectRatioDisplay;
  }

  /**
   * Gets the atlas.
   * @returns {string} - The atlas.
   */
  get atlas() {
    return this._currentAtlas;
  }

  /**
   * @internal
   */
  attachTo(source, callback) {
    this.source = source;
    this.instance.attachTo(source, callback);

    if (this._mobileRaycastMesh) {
      source.add(this._mobileRaycastMesh);
    }
  }

  /**
   * @internal
   */
  processFrames(frames) {
    let i = 0;
    let result = {};
    while (i < frames.length) {
      let frame = frames[i];
      let key = frame.filename.replace(".png", "");
      result[key] = frame;
      i++;
    }
    return result;
  }

  _pos = new Vector3();
  /**
   * @internal
   */
  update() {
    const source = this.source ?? this.instance;

    const sourceP = this._pos.copy(source.positionWorld ?? source.position);

    const dist = sourceP.distanceTo(this.distanceTarget);

    if (dist < this.interactionDistance && this.active == true) {
      source.visible = true;
    } else {
      source.visible = false;
    }

    if (source.visible == true && this.callback != null) {
      this.addKeyEvents();
    } else {
      this.removeKeyEvents();
    }
  }

  /**
   * @internal
   *
   */
  onClick(e) {
    this._mouse.x = (e.rawEvent.clientX / CANVAS.clientWidth) * 2 - 1;
    this._mouse.y = -(e.rawEvent.clientY / CANVAS.clientHeight) * 2 + 1;
    this._raycaster.setFromCamera(this._mouse, Camera.current);

    const intersects = this._raycaster.intersectObject(
      this._mobileRaycastMesh,
      true
    );

    if (intersects.length > 0) {
      this.runCallback(this.callback);
    }
  }

  runCallback(cb) {
    try {
      cb();
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * @internal
   */
  onKey(e) {
    // check if this.key is an array
    if (Array.isArray(this.key)) {
      if (this.key.indexOf(e.code) != -1) {
        this.callback();
      }

      return;
    }

    // if only a string

    if (e.code == this.key) {
      this.runCallback(this.callback);
    }
  }

  /**
   * Disposes the interaction wrapper.
   */
  dispose() {
    this.removeEvents();
    this.removeKeyEvents();
    this.mesh.remove(this.instance);

    if (this._mobileRaycastMesh) {
      this._mobileRaycastMesh.parent.remove(this._mobileRaycastMesh);
      this._mobileRaycastMesh.geometry.dispose();
      this._mobileRaycastMesh.material.dispose();
      this._mobileRaycastMesh = null;
    }

    this._mouse = null;
    this._raycaster = null;
  }

  /**
   * @internal
   */
  addEvents() {
    if (this.updateEvent == null) {
      this.updateEvent = this.update.bind(this);
      emitter.on(EngineEvents.UPDATE, this.updateEvent);
    }
  }

  /**
   * @internal
   */
  removeEvents() {
    if (this.updateEvent) {
      emitter.off(EngineEvents.UPDATE, this.updateEvent);
      this.updateEvent = null;
    }
  }

  /**
   * @internal
   */
  addKeyEvents() {
    if (this.keyEvent == null) {
      if (IS_MOBILE) {
        this.keyEvent = this.onClick.bind(this);
        emitter.on(EngineEvents.CLICK, this.keyEvent);
      } else {
        this.keyEvent = this.onKey.bind(this);
        emitter.on(EngineEvents.KEY_DOWN, this.keyEvent);
      }
      if (this.enterCallback) {
        this.runCallback(this.enterCallback);
      }
    }
  }

  /**
   * @internal
   */
  removeKeyEvents() {
    if (this.keyEvent != null) {
      // handle both mobile and desktop case
      emitter.off(EngineEvents.KEY_DOWN, this.keyEvent);
      emitter.off(EngineEvents.CLICK, this.keyEvent);
      this.keyEvent = null;
      if (this.exitCallback) {
        this.runCallback(this.exitCallback);
      }
    }
  }

  /**
   * Sets the active status.
   * @param {boolean} val - The active status value.
   */
  set active(val) {
    this._active = val;
  }

  /**
   * Gets the active status.
   * @returns {boolean} - The active status.
   */
  get active() {
    return this._active;
  }

  /**
   * Set the opacity of the instance.
   */
  set opacity(val) {
    this.instance.opacity = val;
  }

  /**
   * Get the opacity of the instance.
   * @returns {number} - The opacity.
   */

  get opacity() {
    return this.instance.opacity;
  }

  /**
   * Set the color of the instance.
   */

  set color(val) {
    this.instance.setColor(val);
  }

  /**
   * Get the color of the instance.
   * @returns {number} - The color
   */

  get color() {
    return this.instance.color;
  }
}
