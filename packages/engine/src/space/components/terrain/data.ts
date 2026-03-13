import { Assets } from "../../../internal/resources/assets";

/**
 * Built-in preset texture configurations available for terrain surfaces.
 *
 * Each preset provides a predefined texture with an id, display name, preview image URL,
 * texture asset path, and file format. Use the `id` field when configuring
 * {@link TerrainComponentData.textureOpts} or {@link TerrainComponentData.textureSideOpts}.
 *
 * Available presets: `"grid"`, `"wooden"`, `"rock"`, `"grass"`, `"sand"`, `"snow"`, `"rust"`, `"marble"`, `"brick"`.
 *
 * @public
 */
export const presetImages = {
    grid: {
        id: "grid",
        name: "Grid",
        image: Assets.terrain.gridImg,
        path: Assets.terrain.grid,
        format: ".jpg",
    },
    wooden: {
        id: "wooden",
        name: "Wood",
        image: Assets.terrain.woodenImg,
        path: Assets.terrain.wooden,
        format: ".jpg",
    },
    rock: {
        id: "rock",
        name: "Rock",
        image: Assets.terrain.rockImg,
        path: Assets.terrain.rock,
        format: ".jpg",
    },
    grass: {
        id: "grass",
        name: "Grass",
        image: Assets.terrain.grassImg,
        path: Assets.terrain.grass,
        format: ".jpg",
    },
    sand: {
        id: "sand",
        name: "Sand",
        image: Assets.terrain.sandImg,
        path: Assets.terrain.sand,
        format: ".jpg",
    },
    snow: {
        id: "snow",
        name: "Snow",
        image: Assets.terrain.snowImg,
        path: Assets.terrain.snow,
        format: ".jpg",
    },
    rust: {
        id: "rust",
        name: "Rust",
        image: Assets.terrain.rustImg,
        path: Assets.terrain.rust,
        format: ".jpg",
    },
    marble: {
        id: "marble",
        name: "Marble",
        image: Assets.terrain.marbleImg,
        path: Assets.terrain.marble,
        format: ".jpg",
    },
    brick: {
        id: "brick",
        name: "Brick",
        image: Assets.terrain.brickImg,
        path: Assets.terrain.brick,
        format: ".jpg",
    },
    // custom: {
    //     id: "custom",
    //     name: "Custom",
    // },
};

/**
 * Array of all available preset texture options for the terrain component,
 * derived from {@link presetImages}. Can be iterated to display available texture choices.
 *
 * @public
 */
export const textureOpts = Object.values(presetImages);

/**
 * Available rendering modes for the terrain component.
 *
 * - `"color"` — Flat solid color fill. Configure with {@link TerrainComponentData.color}.
 * - `"texture"` — Tiled image texture. Configure with {@link TerrainComponentData.textureOpts} and {@link TerrainComponentData.tiles}.
 * - `"shader"` — Procedural shader rendering. Choose a shader type with {@link TerrainComponentData.shader}.
 *
 * @public
 */
export const MODES = {
    texture: "texture",
    color: "color",
    shader: "shader",
} as const;

/**
 * Available shader types for the terrain component when {@link TerrainComponentData.mode} is `"shader"`.
 *
 * - `"grid"` — Procedural grid pattern with configurable line spacing ({@link TerrainComponentData.griddiv}),
 *   line width ({@link TerrainComponentData.lineWidth}), and grid color ({@link TerrainComponentData.gridColor}).
 * - `"biplanar"` — Biplanar texture mapping that blends a top texture and a side texture based on surface angle.
 *   Configurable via {@link TerrainComponentData.edgeTransition}, {@link TerrainComponentData.smoothAngle},
 *   {@link TerrainComponentData.noTileDisplacement}, and {@link TerrainComponentData.textureSideOpts}.
 *
 * @public
 */
export const SHADERS = {
    grid: "grid",
    biplanar: "biplanar",
} as const;

/**
 * Available geometry shapes for the terrain component.
 *
 * - `"plane"` — Rectangular flat plane geometry.
 * - `"circle"` — Circular ring geometry. When using this shape, the inner radius
 *   can be configured with {@link TerrainComponentData.innerRadius}.
 *
 * @public
 */
export const TERRAIN_SHAPES = {
    plane: "plane",
    circle: "circle",
};
