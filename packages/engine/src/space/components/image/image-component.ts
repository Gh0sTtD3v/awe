import { Component3D } from "../../abstract/component-3d";
import { ImageFactory } from "../../../internal/media/image";
import { ImageComponentData } from "./image-data";
import { Box3 } from "three";

import InstancedMeshWrapper from "../../../internal/pipeline/instance-mesh-wrapper";
import BorderFactory, { BorderWrapper } from "../../../internal/border";

import {
  IS_EDIT_MODE,
  SET_SHADOW_NEEDS_UPDATE,
} from "../../../internal/constants";
import { LEGACY_fixScale } from "../../../internal/utils/legacy";

export type { ImageComponentData } from "./image-data";

/**
 * @public
 *
 * Renders a 2D image as a flat plane in 3D space. Supports `.png`, `.jpg`, and `.jpeg` formats.
 *
 * The image plane can be positioned, rotated, and scaled in the scene like any other 3D component.
 * It supports configurable opacity, texture filtering (minification and magnification filters),
 * mipmap control, and an optional 3D border/frame around the image.
 *
 * Extends {@link Component3D} and inherits all standard transform, collision, and event capabilities.
 *
 * See {@link ImageComponentData} for the data schema used to create an image component.
 *
 * @example
 * // Basic image displayed in the scene
 * const image = await space.components.create({
 *   type: "image",
 *   url: "https://example.com/photo.jpg",
 *   position: { x: 0, y: 2, z: -5 },
 *   opacity: 0.9,
 * });
 *
 * @example
 * // Image with a 3D border/frame
 * const framedImage = await space.components.create({
 *   type: "image",
 *   url: "https://example.com/painting.png",
 *   position: { x: 3, y: 1.5, z: 0 },
 *   rotation: { x: 0, y: -90, z: 0 },
 *   hasBorder: true,
 *   borderColor: 0x8b4513,
 *   borderSize: 0.08,
 *   borderDepth: 0.15,
 *   borderOpacity: 1,
 * });
 *
 * @example
 * // Pixel-art style image with nearest-neighbor filtering
 * const pixelArt = await space.components.create({
 *   type: "image",
 *   url: "https://example.com/sprite.png",
 *   position: { x: -2, y: 1, z: 0 },
 *   useMipMap: false,
 *   minFilter: "NearestFilter",
 *   magFilter: "NearestFilter",
 * });
 */
export class ImageComponent extends Component3D<ImageComponentData> {
  //
  private _imageFactory: ImageFactory = null;

  /**
   * @internal
   */
  _image: InstancedMeshWrapper = null;

  private _border: BorderWrapper = null;

  /**
   * @internal
   */
  constructor(opts) {
    //
    super(opts);

    this._imageFactory = opts.imageFactory;
  }

  /** @internal */
  protected async init() {
    //
    this._image = await this._imageFactory.get(this.opts.space, {
      ...this.data,
    });

    const scaleRatio = this._image.mesh.baseGeometry.opts.scaleRatio;

    this._border = BorderFactory.get({
      component: this,
      borderOpts: {
        borderSize: this.data.borderSize,
        borderDepth: this.data.borderDepth,
        borderColor: this.data.borderColor,
        borderOpacity: this.data.borderOpacity,
        hasBorder: this.data.hasBorder,
        scaleRatio,
      },
    });

    LEGACY_fixScale(this, scaleRatio);

    this.space.add(this._border.getCollisionMesh());

    this._image.attachTo(this);
  }

  /**
   * @internal
   */
  async onDataChange(opts) {
    // need to respawn the model
    if (
      opts.prev?.useMipMap != this.data.useMipMap ||
      opts.prev?.minFilter != this.data.minFilter ||
      opts.prev?.magFilter != this.data.magFilter
    ) {
      this._imageFactory.dispose(this._image);

      this._image = await this._imageFactory.get(this.opts.space, {
        ...this.data,
      });

      this._image.attachTo(this);
    }

    this._image.opacity = this.data.opacity;

    BorderFactory.updateBorder(this._border, {
      borderColor: this.data.borderColor,
      borderSize: this.data.borderSize,
      borderDepth: this.data.borderDepth,
      borderOpacity: this.data.borderOpacity,
      hasBorder: this.data.hasBorder,
      scaleRatio: this._image.mesh.baseGeometry.opts.scaleRatio,
    });

    if (IS_EDIT_MODE && opts?.isProgress != true) {
      SET_SHADOW_NEEDS_UPDATE(true);
      // console.log('the fuck')
    }
  }

  /** @internal */
  getCollisionMesh() {
    //
    return this._border.getCollisionMesh();
  }

  protected _getBBoxImp(target: Box3) {
    //
    return target.setFromObject(this.getCollisionMesh());
  }

  /** @internal */
  protected dispose() {
    //
    this._imageFactory.dispose(this._image);

    BorderFactory.dispose(this._border);

    this._border.getCollisionMesh().removeFromParent();

    this._image = null;

    this._border = null;
  }
}
