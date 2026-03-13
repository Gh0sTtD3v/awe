import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link TerrainComponent}. Defines the shape, rendering mode, texturing,
 * noise displacement, and visual properties of a terrain surface.
 *
 * The terrain supports three rendering modes:
 * - `"color"` — A flat solid color fill.
 * - `"texture"` — A tiled image texture selected from built-in presets or a custom path.
 * - `"shader"` — A procedural shader, either a `"grid"` pattern or `"biplanar"` texture mapping.
 *
 * The terrain geometry can be a rectangular `"plane"` or a `"circle"` (ring). When noise
 * displacement is enabled, simplex noise deforms the surface to create natural-looking hills
 * and valleys.
 *
 * The terrain also supports physics colliders (configured via the inherited `collider` property
 * from {@link Component3DData}), defaulting to a fixed mesh collider.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface TerrainComponentData extends Component3DData {
    /**
     * @internal
     */
    kit?: "cyber";

    /**
     * Component type. Must be `"terrain"` for terrain components.
     */
    type: "terrain";

    /**
     * Shape of the terrain geometry.
     *
     * - `"plane"` — Rectangular flat plane.
     * - `"circle"` — Circular ring geometry. Use {@link innerRadius} to control the hole size.
     *
     * Defaults to `"plane"`.
     */
    shape?: "plane" | "circle";

    /**
     * Position of the component in the space. Defaults to `{x: 0, y: 0, z: 0}`.
     */
    position?: XYZ;

    /**
     * Rotation of the component in the space (in radians). Defaults to `{x: 0, y: 0, z: 0}`.
     */
    rotation?: XYZ;

    /**
     * Scale of the terrain in world units. Controls the overall size of the terrain surface.
     *
     * - `x` — Width of the terrain.
     * - `y` — Height of the noise displacement (only meaningful when {@link noiseEnabled} is `true`).
     * - `z` — Depth of the terrain.
     *
     * Defaults to `{x: 1000, y: 150, z: 1000}`.
     */
    scale?: XYZ;

    /**
     * Whether noise-based displacement is enabled on the terrain surface. When enabled,
     * simplex noise deforms the terrain geometry to create hills and valleys. Configure
     * noise parameters with {@link definition}, {@link seed}, {@link noiseDomain},
     * {@link smoothCenter}, {@link smoothLength}, {@link islandSmooth}, and {@link islandLength}.
     *
     * Defaults to `false`.
     */
    noiseEnabled?: boolean;

    /**
     * Rendering mode for the terrain surface.
     *
     * - `"color"` — Solid color fill. Configure with {@link color}.
     * - `"texture"` — Tiled image texture. Configure with {@link textureOpts} and {@link tiles}.
     * - `"shader"` — Procedural shader. Choose shader type with {@link shader}.
     *
     * Defaults to `"shader"`.
     */
    mode?: "color" | "texture" | "shader";

    /**
     * Base color applied to the terrain surface as a CSS hex color string.
     *
     * In `"color"` mode, this is the fill color. In `"texture"` and `"shader"` modes,
     * this acts as a tint/multiplier on the material.
     *
     * Defaults to `"#bbbbbb"`.
     */
    color?: string;

    /**
     * Shader type used when {@link mode} is `"shader"`.
     *
     * - `"grid"` — Procedural grid pattern. Configure with {@link griddiv}, {@link lineWidth}, and {@link gridColor}.
     * - `"biplanar"` — Biplanar texture mapping that blends a top texture and side texture based on
     *   surface angle. Configure with {@link edgeTransition}, {@link smoothAngle},
     *   {@link noTileDisplacement}, and {@link textureSideOpts}.
     *
     * Defaults to `"grid"`.
     */
    shader?: "grid" | "biplanar";

    /**
     * Number of grid line divisions when using the `"grid"` shader.
     * Higher values produce more closely spaced grid lines.
     *
     * Range: `10`–`200`. Defaults to `180`.
     *
     * Only used when {@link mode} is `"shader"` and {@link shader} is `"grid"`.
     */
    griddiv?: number;

    /**
     * Width of the grid lines when using the `"grid"` shader.
     *
     * Range: `0`–`1`. Defaults to `0.5`.
     *
     * Only used when {@link mode} is `"shader"` and {@link shader} is `"grid"`.
     */
    lineWidth?: number;

    /**
     * Color of the grid lines when using the `"grid"` shader.
     * Accepts a CSS hex color string.
     *
     * Defaults to `"#000000"`.
     *
     * Only used when {@link mode} is `"shader"` and {@link shader} is `"grid"`.
     */
    gridColor?: string;

    /**
     * Texture configuration for the terrain surface. Used when {@link mode} is `"texture"`,
     * or when {@link mode} is `"shader"` and {@link shader} is `"biplanar"` (as the top texture).
     *
     * Provide either a preset `id` to use a built-in texture, or a custom `path` to a texture file.
     *
     * Defaults to the `"wooden"` preset.
     */
    textureOpts?: {
        /**
         * Predefined texture identifier. Available presets:
         * `"grid"`, `"wooden"`, `"rock"`, `"grass"`, `"sand"`, `"snow"`, `"rust"`, `"marble"`, `"brick"`.
         */
        id?:
            | "grid"
            | "wooden"
            | "rock"
            | "grass"
            | "sand"
            | "snow"
            | "rust"
            | "marble"
            | "brick";
        /**
         * Path to a custom texture file.
         */
        path?: string;
    };

    /**
     * Side texture configuration for biplanar shader mapping. Defines the texture applied to
     * steep/side-facing surfaces of the terrain. Has the same shape as {@link textureOpts}.
     *
     * Defaults to the `"grass"` preset.
     *
     * Only used when {@link mode} is `"shader"` and {@link shader} is `"biplanar"`.
     */
    textureSideOpts?: {
        /**
         * Predefined texture identifier for the side texture. Available presets:
         * `"grid"`, `"wooden"`, `"rock"`, `"grass"`, `"sand"`, `"snow"`, `"rust"`, `"marble"`, `"brick"`.
         */
        id?:
            | "grid"
            | "wooden"
            | "rock"
            | "grass"
            | "sand"
            | "snow"
            | "rust"
            | "marble"
            | "brick";
        /**
         * Path to a custom texture file for the side texture.
         */
        path?: string;
    };

    /**
     * Number of texture tile repetitions across the terrain surface.
     * Higher values result in a more repeated (smaller) texture pattern.
     *
     * Range: `1`–`500`. Defaults to `20`.
     *
     * Used when {@link mode} is `"texture"`, or when {@link mode} is `"shader"` and
     * {@link shader} is `"biplanar"`.
     */
    tiles?: number;

    /**
     * Grid subdivision level for the noise-displaced geometry. Higher values produce
     * a more detailed (smoother) terrain surface at the cost of more geometry.
     *
     * Range: `10`–`200`. Defaults to `100`.
     *
     * Only used when {@link noiseEnabled} is `true`.
     */
    definition?: number;

    /**
     * Seed for the simplex noise generator. Different seeds produce different terrain shapes.
     *
     * Range: `0`–`65536`. Defaults to `4321`.
     *
     * Only used when {@link noiseEnabled} is `true`.
     */
    seed?: number;

    /**
     * Frequency/scale of the noise function. Higher values produce more frequent
     * (smaller) terrain features; lower values produce broader, gentler hills.
     *
     * Range: `0.1`–`10`. Defaults to `5`.
     *
     * Only used when {@link noiseEnabled} is `true`.
     */
    noiseDomain?: number;

    /**
     * Center smoothing factor for noise displacement. Controls how much the center
     * of the terrain is smoothed relative to the edges.
     *
     * Range: `0`–`1`. Defaults to `0.5`.
     *
     * Only used when {@link noiseEnabled} is `true`.
     */
    smoothCenter?: number;

    /**
     * Smoothing transition length for noise displacement. Controls the width of
     * the transition zone for the center smoothing effect.
     *
     * Range: `0`–`1`. Defaults to `0.1`.
     *
     * Only used when {@link noiseEnabled} is `true`.
     */
    smoothLength?: number;

    /**
     * Distance threshold beyond which the island smoothing effect begins.
     * Vertices farther than this distance from the center will be smoothly
     * attenuated to create an island-like falloff.
     *
     * Range: `0`–`1`. Defaults to `1`.
     *
     * Only used when {@link noiseEnabled} is `true`.
     */
    islandSmooth?: number;

    /**
     * Length of the island smoothing transition. Controls how gradually the
     * terrain height falls off at the island edge.
     *
     * Range: `0`–`1`. Defaults to `0.1`.
     *
     * Only used when {@link noiseEnabled} is `true`.
     */
    islandLength?: number;

    /**
     * Inner radius for the ring geometry when {@link shape} is `"circle"`.
     * A value of `0` produces a filled circle; higher values create a ring
     * with a hole in the center.
     *
     * Range: `0`–`0.5`. Defaults to `0`.
     *
     * Only used when {@link shape} is `"circle"`.
     */
    innerRadius?: number;

    /**
     * Edge blending transition factor for the biplanar shader. Controls how sharply
     * the top and side textures blend at surface angle boundaries.
     *
     * Range: `0.01`–`8`. Defaults to `5`.
     *
     * Only used when {@link mode} is `"shader"` and {@link shader} is `"biplanar"`.
     */
    edgeTransition?: number;

    /**
     * Tile displacement factor for the biplanar shader. Controls the displacement
     * applied to texture tiling to reduce visible repetition patterns.
     *
     * Range: `0`–`50`. Defaults to `1`.
     *
     * Only used when {@link mode} is `"shader"` and {@link shader} is `"biplanar"`.
     */
    noTileDisplacement?: number;

    /**
     * Angle-based blending smoothness for the biplanar shader. Controls how smoothly
     * the top texture transitions into the side texture based on surface normal angle.
     *
     * Range: `0`–`1`. Defaults to `0.7`.
     *
     * Only used when {@link mode} is `"shader"` and {@link shader} is `"biplanar"`.
     */
    smoothAngle?: number;

    /**
     * Whether the terrain remains visible during the occlusion rendering pass.
     *
     * Defaults to `true`.
     */
    visibleOnOcclusion?: boolean;

    /**
     * Whether the terrain casts shadows onto other objects.
     * Defaults to `true`.
     */
    castShadow?: boolean;

    /**
     * Whether the terrain receives shadows from other objects.
     * Defaults to `true`.
     */
    receiveShadow?: boolean;
}
