import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link ImageComponent}. Defines the configuration for displaying
 * a 2D image in 3D space. Supported image formats are `.png`, `.jpg`, and `.jpeg`.
 *
 * The image is rendered as a flat plane and supports configurable opacity, texture filtering,
 * and an optional 3D border/frame around the image.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface ImageComponentData extends Component3DData {
  /**
   * @internal
   */
  kit?: "cyber";

  /**
   * Component type discriminator. Must be `"image"`.
   */
  type: "image";

  /**
   * if not provided, an auto id will be generated
   */
  id?: string;

  /**
   * name for the component. Defaults to ""
   */
  name?: string;

  /**
   * URL of the image file. Supported formats: `.png`, `.jpg`, `.jpeg`.
   * This is a required field.
   */
  url: string;

  /**
   * Position of the component in the space. Defaults to {x: 0, y: 0, z: 0}
   */
  position?: XYZ;

  /**
   * Rotation of the component in the space. Defaults to {x: 0, y: 0, z: 0}
   */
  rotation?: XYZ;

  /**
   * Scale of the component in the space. Defaults to {x: 1, y: 1, z: 1}
   */
  scale?: XYZ;

  /**
   * Color of the border/frame around the image, as a hex number (e.g. `0xff0000` for red).
   * Only applies when {@link hasBorder} is `true`. Defaults to `0x000000` (black).
   */
  borderColor?: number;

  /**
   * Thickness of the border relative to the image. Valid range: 0–1.
   * Only applies when {@link hasBorder} is `true`. Defaults to `0.05`.
   */
  borderSize?: number;

  /**
   * Depth (extrusion) of the 3D border/frame. Valid range: 0–1.
   * Only applies when {@link hasBorder} is `true`. Defaults to `0.1`.
   */
  borderDepth?: number;

  /**
   * Opacity of the border. 0 = fully transparent, 1 = fully opaque. Valid range: 0–1.
   * Only applies when {@link hasBorder} is `true`. Defaults to `1`.
   */
  borderOpacity?: number;

  /**
   * Whether to display a 3D border/frame around the image. When `true`, the
   * {@link borderColor}, {@link borderSize}, {@link borderDepth}, and {@link borderOpacity}
   * properties take effect. Defaults to `false`.
   */
  hasBorder?: boolean;

  /**
   * @internal
   */
  hd?: boolean;

  /**
   * Opacity of the image. 0 = fully transparent, 1 = fully opaque.
   * Valid range: 0–1. Defaults to `1`.
   */
  opacity?: number;

  /**
   * Whether the image texture should use mipmaps. Mipmaps improve rendering quality
   * when the image is viewed at smaller sizes or from a distance. Changing this value
   * at runtime causes the image texture to be recreated. Defaults to `true`.
   */
  useMipMap?: boolean;

  /**
   * Minification filter for the image texture. Controls how the texture is sampled
   * when it appears smaller than its original size. Changing this value at runtime
   * causes the image texture to be recreated.
   *
   * Valid values: `"NearestFilter"`, `"NearestMipmapNearestFilter"`,
   * `"NearestMipmapLinearFilter"`, `"LinearFilter"`, `"LinearMipmapNearestFilter"`,
   * `"LinearMipmapLinearFilter"`.
   *
   * Defaults to `"LinearMipmapLinearFilter"`.
   */
  minFilter?: string;

  /**
   * Magnification filter for the image texture. Controls how the texture is sampled
   * when it appears larger than its original size. Changing this value at runtime
   * causes the image texture to be recreated.
   *
   * Valid values: `"NearestFilter"`, `"LinearFilter"`.
   *
   * Defaults to `"LinearFilter"`.
   */
  magFilter?: string;
}
