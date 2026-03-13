import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link ReflectorComponent}, see {@link ComponentManager.create} on how to create a component.
 *
 * Configures a flat reflective surface (mirror floor) with options for color tinting,
 * opacity, blur, and normal mapping to simulate surface texture imperfections.
 *
 * This is a **singleton** component — only one reflector can exist per space.
 * A reflector and a water component cannot coexist in the same space.
 */
export interface ReflectorComponentData extends Component3DData {
  /**
   * Component type discriminator. Must be `"reflector"`.
   */
  type: "reflector";

  /**
   * Optional identifier for the component. If not provided, an auto-generated id will be assigned.
   */
  id?: string;

  /**
   * Display name for the component. Defaults to `""`.
   */
  name?: string;

  /**
   * CSS hex color string used to tint the reflection. Defaults to `"#9fbada"` (light blue).
   */
  color?: string;

  /**
   * Position of the reflector in world space. Defaults to `{x: 0, y: 0.01, z: 0}`.
   *
   * The default `y` value of `0.01` slightly elevates the plane above the origin
   * to avoid z-fighting with ground surfaces.
   */
  position?: XYZ;

  /**
   * Scale of the reflector plane in world units, controlling its width (x) and depth (z).
   * Since the reflector is a flat plane, only the `x` and `z` axes are applicable.
   * Defaults to `{x: 1000, z: 1000}`.
   */
  scale?: {
    /** Width of the reflector plane. Defaults to `1000`. Range: `1` to `5000`. */
    x?: number;
    /** Depth of the reflector plane. Defaults to `1000`. Range: `1` to `5000`. */
    z?: number;
  };

  /**
   * Opacity of the reflective surface, from `0` (fully transparent) to `1` (fully opaque).
   * Defaults to `1`.
   */
  opacity?: number;

  /**
   * Whether to apply a blur effect to the reflection, softening it for a more
   * realistic appearance. Defaults to `true`.
   */
  blur?: boolean;

  /**
   * Normal map configuration for the reflector surface. Applies a normal map texture
   * to create the appearance of surface imperfections such as bumps, tiles, ice cracks,
   * or brick patterns.
   */
  normalmap?: {
    /** Whether the normal map effect is active. Defaults to `false`. */
    enabled?: boolean;
    /** Intensity of the normal map effect. Range: `0.01` to `1`. Defaults to `0.5`. */
    strength?: number;
    /** Tiling/repeat factor for the normal map texture. Range: `0.1` to `20`. Defaults to `0.3`. */
    tiles?: number;
    /**
     * The normal map image descriptor. Use one of the built-in preset IDs
     * (`"bump"`, `"ice"`, `"holes"`, `"ancient"`, `"bricks"`, `"metalsheet"`)
     * or `"custom"` with a custom image path.
     */
    images?: {
      /** Identifier for the normal map. Built-in values: `"bump"`, `"ice"`, `"holes"`, `"ancient"`, `"bricks"`, `"metalsheet"`, or `"custom"`. */
      id: string;
      /** Display name for the normal map. */
      name: string;
      /** URL or asset path to the normal map image. */
      image: string;
      /** Asset path to the normal map image file. */
      path: string;
      /** Image file format (e.g. `".jpg"`). */
      format?: string;
    };
    /** Custom normal map image data. Used when `images.id` is `"custom"`. */
    customImage?: any;
  };
}
