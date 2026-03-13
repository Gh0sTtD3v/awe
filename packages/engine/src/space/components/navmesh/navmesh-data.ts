import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * Parameters for navmesh generation using the Recast Navigation algorithm.
 *
 * These parameters control how the navigation mesh is built from collision geometry,
 * affecting agent traversability, voxel resolution, region formation, and polygon detail.
 * All properties are optional; sensible defaults are provided for each.
 *
 * @public
 */
export interface NavmeshParams {
  /**
   * Minimum floor-to-ceiling height that will still allow the floor area to be considered walkable.
   * Used to filter out areas under overhangs, bridges, and alcoves. Typically set to the maximum agent height.
   *
   * Range: `[0.1–5]`. Defaults to `2`.
   */
  walkableHeight?: number;

  /**
   * The distance to erode/shrink the walkable area away from obstructions.
   * Prevents agents from walking too close to walls and edges.
   * A recommended starting value for `cs` is `walkableRadius / 2` or `walkableRadius / 3`.
   *
   * Range: `[0–5]`. Defaults to `0.6`.
   */
  walkableRadius?: number;

  /**
   * Maximum ledge height that is considered traversable.
   * Allows agents to step over small obstacles like curbs and stairs.
   *
   * Range: `[0.1–5]`. Defaults to `0.5`.
   */
  walkableClimb?: number;

  /**
   * Maximum slope angle in degrees that is considered walkable.
   *
   * Range: `[0–90]`. Defaults to `45`.
   */
  walkableSlopeAngle?: number;

  /**
   * The width and depth of tiles on the xz-plane. Only used when building tiled navmeshes.
   *
   * Range: `[0–1024]`. Defaults to `32`.
   */
  tileSize?: number;

  /**
   * The xz-plane cell size used for voxelization. Controls horizontal resolution of the navmesh.
   * A recommended starting value is `walkableRadius / 2` or `walkableRadius / 3`.
   * Smaller values produce more accurate navmeshes but increase generation time.
   *
   * Range: `[0.1–1]`. Defaults to `0.2`.
   */
  cs?: number;

  /**
   * The y-axis cell height used for voxelization. Controls vertical resolution of the navmesh.
   * A good starting point is half the `cs` value. Smaller values improve vertical precision,
   * ensuring the navmesh properly connects areas separated by small curbs or ditches.
   *
   * Range: `[0.1–1]`. Defaults to `0.2`.
   */
  ch?: number;

  /**
   * Minimum number of cells allowed to form isolated island areas.
   * Regions smaller than this are marked as unwalkable. Useful for removing
   * small artifact regions that form on geometry like table tops or box tops.
   *
   * Range: `[0–150]`. Defaults to `8`.
   */
  minRegionArea?: number;

  /**
   * Regions with a span count smaller than this value will be merged with larger neighbors when possible.
   *
   * Range: `[0–150]`. Defaults to `20`.
   */
  mergeRegionArea?: number;

  /**
   * Maximum allowed length for contour edges along the border of the mesh.
   * Long outer edges can decrease triangulation quality; this parameter causes them to be
   * broken into smaller segments. A good value is `walkableRadius * 8`.
   *
   * Range: `[0–100]`. Defaults to `20`.
   */
  maxEdgeLen?: number;

  /**
   * Maximum distance a simplified contour's border edges may deviate from the original raw contour.
   * Good values are in the range `[1.1–1.5]`. Values below `1.1` cause sawtoothing;
   * values above `1.5` cause corner cutting.
   *
   * Range: `[0.1–3]`. Defaults to `1.3`.
   */
  maxSimplificationError?: number;

  /**
   * Maximum number of vertices allowed per polygon generated during contour-to-polygon conversion.
   *
   * Range: `[3–6]`. Defaults to `6`.
   */
  maxVertsPerPoly?: number;

  /**
   * Sampling distance used when generating the detail mesh. Values less than `0.9` are treated as `0`.
   *
   * Range: `[0–10]`. Defaults to `6`.
   */
  detailSampleDist?: number;

  /**
   * Maximum distance the detail mesh surface may deviate from the heightfield data.
   *
   * Range: `[0–10]`. Defaults to `1`.
   */
  detailSampleMaxError?: number;
}

/**
 * Configuration data for {@link NavmeshComponent}.
 *
 * Defines the configuration for a navigation mesh component used for AI pathfinding.
 * The navmesh is built from fixed-rigidbody collision geometry within a bounded area
 * defined by {@link NavmeshComponentData.position | position} and {@link NavmeshComponentData.scale | scale}.
 * Alternatively, a pre-generated navmesh can be loaded from a URL via the {@link NavmeshComponentData.url | url} property.
 *
 * @public
 */
export interface NavmeshComponentData extends Component3DData {
  /**
   * Component type identifier. Must be `"navmesh"`.
   */
  type: "navmesh";

  /**
   * Unique identifier for this component. If not provided, an auto-generated id will be assigned.
   */
  id?: string;

  /**
   * Display name for the component. Defaults to `""`.
   */
  name?: string;

  /**
   * Center position of the bounding area used for navmesh generation.
   * Only collision geometry within this bounding box is included.
   *
   * Defaults to `{x: 0, y: 0, z: 0}`.
   */
  position?: XYZ;

  /**
   * Size of the bounding area used for navmesh generation.
   * Defines the full extents (width, height, depth) of the box centered at {@link NavmeshComponentData.position | position}.
   *
   * Defaults to `{x: 10, y: 10, z: 10}`.
   */
  scale?: XYZ;

  /**
   * Navmesh generation parameters controlling voxelization, region formation,
   * and polygon detail. When not provided, default generation parameters are used.
   *
   * See {@link NavmeshParams} for available options and their defaults.
   */
  params?: NavmeshParams;

  /**
   * Comma-separated list of component IDs to exclude from navmesh generation.
   * Excluded components' collision geometry will be ignored.
   */
  exclude?: string;

  /**
   * Comma-separated list of component IDs to include in navmesh generation.
   * When specified, only these components' collision geometry is used.
   */
  include?: string;

  /**
   * URL of a pre-generated navmesh binary to load.
   *
   * The navmesh binary is generated (baked) in the studio editor. The baking process collects
   * collision geometry from fixed-rigidbody objects in the scene, runs the Recast Navigation
   * algorithm, and uploads the resulting binary to cloud storage. At runtime, the navmesh is
   * loaded from this URL rather than regenerated from scene geometry.
   *
   * This field is typically set automatically by the studio after baking.
   */
  url?: string;
}
