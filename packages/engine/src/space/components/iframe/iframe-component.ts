import {
  Component3D,
  DataChangeOpts,
} from "../../abstract/component-3d";
import { IframeComponentData } from "./iframe-data";
import {
  MeshBasicMaterial,
  PlaneGeometry,
  Mesh,
  Color,
  NoBlending,
  Vector3,
  Vector2,
  DoubleSide,
} from "three";

export type { IframeComponentData } from "./iframe-data";

import {
  CANVAS,
  CSS_CANVAS,
  CSS_FACTOR,
  IS_EDIT_MODE,
  IS_MOBILE,
} from "../../../internal/constants";

import { CSS3DObject } from "../../../internal/css3d/css-3d-renderer";

import CSS3D from "../../../internal/css3d/renderer";
import { extractYTVideoId } from "./youtube/utils";
import { YoutubeIframeHandler } from "./youtube/youtube-iframe-handler";
import { FrustumChecker } from "../../../internal/utils/frustum-checker";
import BorderFactory, { BorderWrapper } from "../../../internal/border";

const padding = 0;

const direction = new Vector3();

const origin = new Vector3();

/**
 * @public
 *
 * A component that embeds interactive web pages or YouTube videos into the 3D scene.
 * The iframe content is rendered using CSS3D rendering overlaid on the WebGL scene, with
 * a blocking plane in the GL layer to handle depth and occlusion correctly.
 *
 * YouTube URLs are automatically detected and handled with the YouTube IFrame Player API,
 * providing enhanced playback controls and spatial audio support. Generic URLs are embedded
 * as standard HTML iframes.
 *
 * The component supports an optional configurable border frame around the iframe, and can
 * be toggled visible/hidden in live mode via the `display` property.
 *
 * See {@link IframeComponentData} for the data schema used to create an iframe component.
 *
 * @example
 * ```ts
 * // Embed a generic web page in the 3D scene with a border
 * const webpage = await space.components.create({
 *   type: "iframe",
 *   url: "https://example.com",
 *   position: { x: 0, y: 3, z: -5 },
 *   rotation: { x: 0, y: 0, z: 0 },
 *   scale: { x: 16, y: 9, z: 1 },
 *   hasBorder: true,
 *   borderColor: "#333333",
 *   borderSize: 0.05,
 *   borderDepth: 0.1,
 *   borderOpacity: 1,
 *   display: true,
 *   youtubeOpts: {
 *     autoPlay: false,
 *     audioType: "ambient",
 *     audioRange: 3,
 *     volume: 1,
 *   },
 * });
 * ```
 *
 * @example
 * ```ts
 * // Embed a YouTube video with spatial audio
 * const ytVideo = await space.components.create({
 *   type: "iframe",
 *   url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
 *   position: { x: 5, y: 2, z: 0 },
 *   scale: { x: 8, y: 4.5, z: 1 },
 *   youtubeOpts: {
 *     autoPlay: true,
 *     audioType: "spatial",
 *     audioRange: 15,
 *     volume: 0.8,
 *   },
 * });
 *
 * // Check if the URL was detected as a YouTube video
 * if (ytVideo.urlData.type === "YOUTUBE") {
 *   console.log("Playing YouTube video:", ytVideo.urlData.videoId);
 * }
 * ```
 */
export class IframeComponent extends Component3D<IframeComponentData> {
  /**
   * @internal
   */
  constructor(opts) {
    //
    super(opts);
  }

  private _urlData:
    | { type: "YOUTUBE"; videoId: string; url: string }
    | { type: "GENERIC"; url: string } = null;

  private _ytHandler: YoutubeIframeHandler;

  private cssObject: CSS3DObject;

  private glCache: Mesh;

  private glPlane: Mesh;

  private _border: BorderWrapper;

  private iframe: HTMLIFrameElement;

  private camera = null;

  private physics = null;

  private canvas = null;

  private frustumChecker: FrustumChecker = null;

  /**
   * The parsed URL data for this component. Returns an object indicating whether the URL
   * is a YouTube video or a generic web page.
   *
   * For YouTube URLs, the returned object has `type: "YOUTUBE"`, the extracted `videoId`,
   * and the embed `url`. For generic URLs, the returned object has `type: "GENERIC"` and
   * the normalized `url`.
   */
  get urlData() {
    return this._urlData;
  }

  /** @internal */
  protected init = async () => {
    //
    globalThis.$iframe = this;

    this.canvas = document.getElementById("game-canvas");

    this._urlData = this._getUrlData(this.data.url);
    // iframe

    this.generateIframe();

    this.generatePlanes();

    this._border = BorderFactory.get({
      component: this,
      borderOpts: {
        borderSize: this.data.borderSize,
        borderDepth: this.data.borderDepth,
        borderColor: this.data.borderColor,
        borderOpacity: this.data.borderOpacity,
        hasBorder: this.data.hasBorder,
        scaleRatio: 1,
      },
    });

    this.space.add(this._border.getCollisionMesh());

    this._update3D(false);

    this.camera = this.opts.space.camera;

    this.physics = this.opts.space.physics;

    this._addEvents();
  };

  private _hasEvents = false;

  private _addEvents = () => {
    if (IS_EDIT_MODE) return;
    if (this._hasEvents) return;

    this._hasEvents = true;

    if (IS_MOBILE) {
      window.addEventListener("touchend", this.onTouchEnd);

      window.addEventListener("touchstart", this.onTouchStart);

      window.addEventListener("touchmove", this.onTouchMove);
    } else {
      window.addEventListener("mousemove", this.onMouseMove);
    }
  };

  private _removeEvents = () => {
    if (!this._hasEvents) return;

    this._hasEvents = false;

    if (IS_MOBILE) {
      window.removeEventListener("touchend", this.onTouchEnd);

      window.removeEventListener("touchstart", this.onTouchEnd);

      window.removeEventListener("touchmove", this.onTouchEnd);
    } else {
      window.removeEventListener("mousemove", this.onMouseMove);
    }
  };

  private isDragging = false;

  private onTouchStart = (e) => {
    this.isDragging = false;

    // this.canvas.style.pointerEvents = "auto";
  };

  private onTouchMove = (e) => {
    this.isDragging = true;
  };

  private onTouchEnd = (e) => {
    if (this.isDragging) {
      this.isDragging = false;

      return;
    }

    e.clientX = e.changedTouches[0].clientX;

    e.clientY = e.changedTouches[0].clientY;

    this.handleActivation(e);
  };

  private onMouseMove = (e) => {
    this.handleActivation(e);
  };

  private handleActivation = (e) => {
    if (!IS_MOBILE && document.pointerLockElement === this.canvas) return;

    const hit = this.raycast(e);

    // if (e.target !== this.canvas) return;

    if (hit?.componentType === "iframe") {
      this.canvas.style.pointerEvents = "none";
    } else {
      this.canvas.style.pointerEvents = "all";
    }
  };

  private mousevec = new Vector2();

  /**
   * @internal
   */
  raycast = (e) => {
    if (!this.camera || !this.physics) return;

    const rect = this.canvas.getBoundingClientRect();

    const normalized = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,

      y: ((e.clientY - rect.top) / rect.height) * 2 - 1,
    };

    this.mousevec.set(
      normalized.x,

      -normalized.y,
    );

    origin.setFromMatrixPosition(this.camera.matrixWorld);

    direction
      .set(this.mousevec.x, this.mousevec.y, 0.5)
      .unproject(this.camera)
      .sub(origin)
      .normalize();

    const res = this.physics.physicsRaycast({
      origin,

      direction,

      maxDistance: 1000,
    });

    if (res) {
      return res.component;
    }

    return null;
  };

  /**
   * @internal
   */
  _getUrlData(url: string) {
    //
    url = url.trim();

    // starts with http:// or https:// regex
    if (!/^(http|https):\/\//.test(this.data.url)) {
      url = `https://${url}`;
    }

    // does it start with youtube domain
    const youtubeId = extractYTVideoId(url);

    if (youtubeId) {
      return {
        type: "YOUTUBE",
        videoId: youtubeId,
        url: `https://www.youtube.com/embed/${youtubeId}`,
      } as const;
    } else {
      return { type: "GENERIC", url } as const;
    }
  }

  private _display = true;

  private _setDisplay(value: boolean) {
    if (IS_EDIT_MODE) return;
    if (this._display === value) return;
    this._display = value;

    if (this.cssObject) {
      this.cssObject.visible = value;
    }
    if (this._display) {
      this._addEvents();
    } else {
      this._removeEvents();
    }
  }

  private generateIframe() {
    if (this.cssObject) {
      CSS3D.remove(this.cssObject);

      this.cssObject = null;

      if (this._urlData.type === "YOUTUBE") {
        this._ytHandler?.onDispose();
        this._ytHandler = null;
      }
    }

    if (this.iframe) {
      this.iframe.remove();

      this.iframe = null;
    }

    this._urlData = this._getUrlData(this.data.url);

    if (this._urlData.type === "YOUTUBE") {
      //
      this._ytHandler = new YoutubeIframeHandler(this);
      this.iframe = this._ytHandler.onGenerateIframe();
    } else {
      this.iframe = document.createElement("iframe");
      this.iframe.style.backgroundColor = "#fff";
      this.iframe.src = this._urlData.url;
    }

    this.iframe.style.pointerEvents = "all";
    this.cssObject = new CSS3DObject(this.iframe);
    CSS3D.add(this.cssObject);
  }

  private generatePlanes() {
    const geometry = new PlaneGeometry(1, 1);

    const material = new MeshBasicMaterial({
      color: new Color("black"),
      fog: false,
      blending: NoBlending,
      opacity: 0,
      side: DoubleSide,
    });

    this.glPlane = new Mesh(geometry, material);

    this.glCache = new Mesh(
      geometry,
      new MeshBasicMaterial({
        color: new Color("black"),
        fog: true,
        blending: NoBlending,
        // transparent : true
      }),
    );

    this.glCache.visible = true;

    (this.cssObject as any).glCache = this.glCache;
    (this.cssObject as any).glPlane = this.glPlane;

    this.add(this.glPlane);

    this.add(this.glCache);
  }

  /**
   * @internal
   */
  onDataChange(opts: DataChangeOpts): void {
    //
    if ((opts.prev as any).url !== this.data.url) {
      this._disposeIframe();

      this.generateIframe();

      this.generatePlanes();
    }

    this._update3D(opts.isProgress);
  }

  /**
   * @internal
   */
  _update3D(isProgress: boolean) {
    this.iframe.style.width = `${this.data.scale.x * CSS_FACTOR + padding}px`;
    this.iframe.style.height = `${this.data.scale.y * CSS_FACTOR + padding}px`;

    this.position.set(
      this.data.position.x,
      this.data.position.y,
      this.data.position.z,
    );
    this.rotation.set(
      this.data.rotation.x,
      this.data.rotation.y,
      this.data.rotation.z,
    );
    this.scale.set(this.data.scale.x, this.data.scale.y, this.data.scale.z);

    this.cssObject.position.set(
      this.data.position.x,
      this.data.position.y,
      this.data.position.z,
    );
    this.cssObject.rotation.set(
      this.data.rotation.x,
      this.data.rotation.y,
      this.data.rotation.z,
    );
    this.cssObject.position.multiplyScalar(CSS_FACTOR);

    this._setDisplay(this.data.display);

    this._ytHandler?.onUpdate();

    BorderFactory.updateBorder(this._border, {
      borderColor: this.data.borderColor,
      borderSize: this.data.borderSize,
      borderDepth: this.data.borderDepth,
      borderOpacity: this.data.borderOpacity,
      hasBorder: this.data.hasBorder,
      scaleRatio: 1,
    });
  }

  protected _onCreateCollisionMesh() {
    return this.glPlane;
  }

  /**
   * @internal
   */
  getCollisionMesh() {
    return this._border.getCollisionMesh();
  }

  // protected _getBBoxImp(target: Box3) {
  //     //
  //     // return target.setFromObject(this.getCollisionMesh());
  // }

  protected _disposeIframe() {
    //
    if (this.glPlane) {
      this.glPlane.parent.remove(this.glPlane);
      this.glPlane.geometry.dispose();
      // @ts-ignore
      this.glPlane.material.dispose();

      this.glPlane = null;
    }

    if (this.glCache) {
      this.glCache.parent.remove(this.glCache);
      this.glCache.geometry.dispose();
      // @ts-ignore
      this.glCache.material.dispose();

      this.glCache = null;
    }

    if (this.cssObject) {
      CSS3D.remove(this.cssObject);

      this.cssObject = null;
    }

    if (this.iframe) {
      this.iframe.remove();

      this.iframe = null;
    }

    //
    // this._imageFactory.dispose(this._image);

    // this._image = null;

    if (!IS_EDIT_MODE) {
      this._removeEvents();
    }
  }

  /** @internal */
  protected dispose() {
    //
    this._border.getCollisionMesh().removeFromParent();
    BorderFactory.dispose(this._border);

    this._disposeIframe();
  }
}
