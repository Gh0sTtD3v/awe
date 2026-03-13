import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for the {@link WaterComponent}. Defines a flat animated water
 * plane in the 3D scene with configurable color, opacity, and dimensions.
 */
export interface WaterComponentData extends Component3DData {
  /**
   * @internal
   */
  kit?: "cyber";

  /**
   * Component type discriminator. Must be `"water"`.
   */
  type: "water";

  /**
   * Position of the water plane in world space.
   *
   * Defaults to `{x: 0, y: 1, z: 0}`.
   */
  position?: XYZ;

  /**
   * Rotation of the water plane in world space, in radians.
   *
   * Defaults to `{x: 0, y: 0, z: 0}`.
   */
  rotation?: XYZ;

  /**
   * 2D scale controlling the width (x) and depth (z) of the water plane in
   * world units. Valid range for each axis is 1–5000.
   *
   * Defaults to `{x: 1000, z: 1000}`.
   */
  scale?: { x: number; z: number };

  /**
   * CSS hex color string for the water surface tint.
   *
   * Defaults to `"#001E0F"` (dark green).
   */
  color?: string;

  /**
   * Opacity of the water surface, where 0 is fully transparent and 1 is
   * fully opaque.
   *
   * Valid range: 0–1. Defaults to `1`.
   */
  opacity: number;
}
