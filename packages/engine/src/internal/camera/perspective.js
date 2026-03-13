// @ts-check

import {
  PerspectiveCamera,
  Quaternion,
  Vector3,
  CameraHelper,
  WebGLRenderTarget,
  LinearFilter,
  FloatType,
  NearestFilter,
  RGBAFormat,
  Frustum,
  Matrix4,
  PlaneGeometry,
  MeshBasicMaterial,
} from "three";

import emitter from "../engine-emitter";
import { EngineEvents } from "../engine-events";

import { DPI, IS_EDIT_MODE, VIEW } from "../constants";

import SpaceFactory from "../../space";

import PostProcessing from "../rendering/postprocessing";

import Scene from "../scene";

import WindowRenderer from "./window";

import Renderer from "../renderer";

import { Assets } from "../resources/assets";

const DEFAULT_PREVIEW_SIZE = 512;

import Textures from "../textures";
import PipeLineMesh from "../pipeline/pipeline-mesh";

const tempPositon = new Vector3();
const tempScale = new Vector3();
const tempQuaternion = new Quaternion();

import { CAMERA_LAYERS } from "../constants";

// this.textureMap = await Loader.loadTexture(image);

export default class Perspective extends PerspectiveCamera {
  constructor(parent, opts) {
    super(opts.fov, opts.aspect, opts.near, opts.far);

    this.opts = opts;

    this.layers.enableAll();

    this.layers.disable(CAMERA_LAYERS.EDITOR);

    this._ratio = 25 / 9;

    this._previewSize = DEFAULT_PREVIEW_SIZE;

    this._lockMode = {
      x: 0,
      y: 0,
    };

    if (opts.lockMode) {
      this._lockMode = opts.lockMode;
    }

    if (opts.previewRatio) {
      this._ratio = opts.previewRatio;
    }

    if (opts._previewSize) {
      this._previewSize = opts._previewSize;
    }

    this.frustum = new Frustum();

    this.projScreenMatrix = new Matrix4();

    if (IS_EDIT_MODE) {
      this.addCameraIcon();
    }

    this.space = parent;

    parent.add(this);
  }

  async addCameraIcon() {
    if (this.cameraIconMesh != null) {
      return;
    }

    if (Textures["CAMERA_ICON"] == null) {
      let data = {
        name: "CAMERA_ICON",
        url: Assets.textures.cameraIcon,
      };

      await Textures.loadTextures([data]);
    }

    this.cameraIconMesh = new PipeLineMesh(
      new PlaneGeometry(2, 2),
      new MeshBasicMaterial({
        map: Textures["CAMERA_ICON"],
        transparent: true,
        alphaTest: 0.5,
      }),
      {
        occlusionMaterial: new MeshBasicMaterial({
          map: Textures["CAMERA_ICON"],
          color: 0x000000,
          transparent: true,
          alphaTest: 0.5,
        }),
      }
    );

    this.add(this.cameraIconMesh);

    this.cameraIconMesh.onBeforeRender = (
      renderer,
      scene,
      camera,
      geometry,
      material,
      group
    ) => {
      this.cameraIconMesh.matrixWorld.decompose(
        tempPositon,
        tempQuaternion,
        tempScale
      );

      this.cameraIconMesh.matrixWorld.compose(
        tempPositon,
        camera.quaternion,
        tempScale
      );
    };
  }

  renderUpdate() {
    if (this.helper) {
      this.helper.userData._previousVisibility = this.helper.visible;
      this.helper.visible = false;
    }

    this.projScreenMatrix.multiplyMatrices(
      this.projectionMatrix,
      this.matrixWorldInverse
    );

    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    let oldAutoUpdate = Scene.matrixWorldAutoUpdate;

    Scene.matrixWorldAutoUpdate = false;

    let ot = Renderer.getRenderTarget();

    Renderer.setRenderTarget(this.renderTarget);

    Renderer.clear();

    Renderer.setRenderTarget(ot);

    PostProcessing.render(Scene, this, this.renderTarget);

    this.windowRenderer.update();

    if (this.helper) {
      this.helper.visible = this.helper.userData._previousVisibility;
    }

    Scene.matrixWorldAutoUpdate = oldAutoUpdate;
  }

  addEvents() {
    if (this.updateEvent == null) {
      if (IS_EDIT_MODE) {
        this.updateEvent = this.renderUpdate.bind(this);

        emitter.on(EngineEvents.POST_RENDER, this.updateEvent);

        this.resizeEvent = this.resize.bind(this);

        emitter.on(EngineEvents.RESIZE, this.resizeEvent);

        this.resize();
      }
    }
  }

  removeEvents() {
    if (this.updateEvent != null) {
      emitter.off(EngineEvents.POST_RENDER, this.updateEvent);

      this.updateEvent = null;
    }

    if (this.resizeEvent != null) {
      emitter.off(EngineEvents.RESIZE, this.resizeEvent);

      this.resizeEvent = null;
    }
  }

  resize(w = VIEW.w, h = VIEW.h) {
    this.aspect =
      (this.previewSize * DPI * this.ratio) / (this.previewSize * DPI);

    this.updateProjectionMatrix();

    if (this.helper) {
      this.helper.update();
    }

    if (this.windowRenderer) {
      this.windowRenderer.setSize(w, h);
    }
  }

  togglePreview(val) {
    if (val == true && this.renderTarget == null) {
      this.renderTarget = new WebGLRenderTarget(
        this._previewSize * DPI,
        (this._previewSize * DPI) / this._ratio,
        {
          minFilter: LinearFilter,
          magFilter: NearestFilter,
          format: RGBAFormat,
          stencilBuffer: false,
          depthBuffer: true,
          type: FloatType,
          generateMipmaps: false,
        }
      );

      this.windowRenderer = new WindowRenderer(this.renderTarget);

      this.windowRenderer.setMode(this._lockMode);
    }

    if (val == true) {
      this.addEvents();
    } else {
      this.removeEvents();
    }
  }

  set ratio(val) {
    this._ratio = val;

    if (this.renderTarget) {
      this.renderTarget.setSize(
        this._previewSize * DPI,
        (this._previewSize * DPI) / this._ratio
      );

      this.windowRenderer.refresh(this.renderTarget);

      this.resize();
    }
  }

  get ratio() {
    return this._ratio;
  }

  set previewSize(val) {
    this._previewSize = val;

    if (this.renderTarget) {
      this.renderTarget.setSize(
        this._previewSize * DPI,
        (this._previewSize * DPI) / this._ratio
      );

      this.windowRenderer.refresh(this.renderTarget);

      this.resize();
    }
  }

  get previewSize() {
    return this._previewSize;
  }

  set lockMode(val) {
    this._lockMode = val;

    if (this.windowRenderer) {
      this.windowRenderer.setMode(val);
    }
  }

  get lockMode() {
    return this._lockMode;
  }

  toggleHelper(val) {
    if (IS_EDIT_MODE == false) return;

    if (val == true && this.helper == null) {
      this.helper = new CameraHelper(this);

      Scene.add(this.helper);

      this.helper.visible = false;
    }

    if (this.helper == null && val == false) {
      return;
    }

    if (this.helper != null) {
      this.helper.visible = val;
    }

    if (this.helper.visible == true) {
      this.addCameraEvents();
    } else {
      this.removeCameraEvents();
    }

    this.updateHelper();
  }

  updateHelper() {
    if (this.helper && this.helper.visible) {
      this.helper.matrixWorld = this.matrixWorld;
      this.helper.update();
    }
  }

  addCameraEvents() {
    if (this.cameraUpdateEvent == null) {
      this.cameraUpdateEvent = this.updateHelper.bind(this);

      emitter.on(EngineEvents.LATE_UPDATE, this.cameraUpdateEvent);
    }
  }
  removeCameraEvents() {
    if (this.cameraUpdateEvent) {
      emitter.off(EngineEvents.LATE_UPDATE, this.cameraUpdateEvent);

      this.cameraUpdateEvent = null;
    }
  }

  dispose() {
    this.removeEvents();

    this.removeCameraEvents();

    if (this.helper) {
      this.helper.dispose();

      this.helper.parent.remove(this.helper);

      this.helper = null;
    }

    if (this.windowRenderer) {
      this.windowRenderer.dispose();

      this.windowRenderer = null;
    }

    if (this.renderTarget) {
      this.renderTarget.dispose();

      this.renderTarget = null;
    }
  }
}
