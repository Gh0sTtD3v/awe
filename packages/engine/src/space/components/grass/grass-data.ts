import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link GrassComponent}. Defines the appearance and transform
 * of a procedural grass patch in the scene.
 *
 * The grass component uses a dual color palette system to render varied, natural-looking grass.
 * Each palette defines a base color (root of the blade) and tip colors (top of the blade):
 *
 * - **Palette 1**: `uBaseColor`, `uTipColor1`, `uTipColor2`
 * - **Palette 2**: `uBaseColor2`, `uTipColor3`, `uTipColor4`
 *
 * The `colorRepartition` property controls the blend between the two palettes.
 *
 * All color properties use hex number format (e.g., `0x9bd38d`).
 */
export interface GrassComponentData extends Component3DData {
  /**
   * @internal
   */
  kit?: "cyber";

  /**
   * Component type identifier. Must be `"grass"`.
   */
  type: "grass";

  /**
   * if not provided, an auto id will be generated
   */
  id?: string;

  /**
   * name for the component. Defaults to ""
   */
  name?: string;

  /**
   * Position of the component in the space. Defaults to {x: 0, y: 0, z: 0}
   */
  position?: XYZ;

  /**
   * Rotation of the component in the space. Defaults to {x: 0, y: 0, z: 0}
   */
  rotation?: XYZ;

  /**
   * Scale of the component in the space. Controls the area covered by the grass patch.
   * Defaults to {x: 5, y: 5, z: 5}
   */
  scale?: XYZ;

  /**
   * General tint color applied to the grass. Specified as a hex number (e.g., `0xffffff`).
   * Defaults to `0xffffff`
   */
  color?: number;

  /**
   * Base color at the root of grass blades in the first color palette.
   * Specified as a hex number (e.g., `0x313f1b`). Defaults to `0x313f1b`
   */
  uBaseColor: number;

  /**
   * Base color at the root of grass blades in the second color palette.
   * Specified as a hex number (e.g., `0x313f1b`). Defaults to `0x313f1b`
   */
  uBaseColor2: number;

  /**
   * Primary tip color of grass blades in the first color palette.
   * Specified as a hex number (e.g., `0x9bd38d`). Defaults to `0x9bd38d`
   */
  uTipColor1: number;

  /**
   * Secondary tip color of grass blades in the first color palette, blended with `uTipColor1`.
   * Specified as a hex number (e.g., `0x1f352a`). Defaults to `0x1f352a`
   */
  uTipColor2: number;

  /**
   * Primary tip color of grass blades in the second color palette.
   * Specified as a hex number (e.g., `0x82c2a3`). Defaults to `0x82c2a3`
   */
  uTipColor3: number;

  /**
   * Secondary tip color of grass blades in the second color palette, blended with `uTipColor3`.
   * Specified as a hex number (e.g., `0x1f352a`). Defaults to `0x1f352a`
   */
  uTipColor4: number;

  /**
   * Controls the blend between the two color palettes. A value of `0` uses only
   * the first palette (uBaseColor / uTipColor1 / uTipColor2), a value of `1` uses only
   * the second palette (uBaseColor2 / uTipColor3 / uTipColor4), and intermediate values
   * blend between both palettes.
   *
   * Valid range: `0` to `1`. Defaults to `0.5`
   */
  colorRepartition: number;
}
