import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link BatchComponent}.
 *
 * BatchComponentData defines a collection of instances of a single base component (the "preset"),
 * each placed at a different position, rotation, and scale. The instance transforms are stored as
 * flat arrays where every 3 consecutive values represent one instance's `[x, y, z]` vector.
 * The total number of instances is `positions.length / 3`.
 */
export interface BatchComponentData extends Component3DData {
  /**
   * @internal
   */
  kit?: "cyber";

  /**
   * Component type identifier. Must be `"batch"`.
   */
  type: "batch";

  /**
   * if not provided, an auto id will be generated
   */
  id?: string;

  /**
   * name for the component. Defaults to ""
   */
  name?: string;

  /**
   * Flat array of instance positions. Every 3 consecutive values represent one instance's
   * `[x, y, z]` position in the batch component's local space. For example, `[0, 0, 0, 5, 0, 3]`
   * defines two instances at positions `(0,0,0)` and `(5,0,3)`.
   *
   * The length must be a multiple of 3 and must match the length of `rotations` and `scales`.
   *
   * @default []
   */
  positions: number[];

  /**
   * Flat array of instance rotations in radians (Euler angles). Every 3 consecutive values represent
   * one instance's `[x, y, z]` Euler rotation. For example, `[0, 0, 0, 0, 1.57, 0]`
   * defines two instances, the second rotated 90 degrees around the Y axis.
   *
   * The length must be a multiple of 3 and must match the length of `positions` and `scales`.
   *
   * @default []
   */
  rotations: number[];

  /**
   * Flat array of instance scales. Every 3 consecutive values represent one instance's
   * `[x, y, z]` scale factor. For example, `[1, 1, 1, 2, 2, 2]` defines two instances,
   * the second scaled to twice the size.
   *
   * The length must be a multiple of 3 and must match the length of `positions` and `rotations`.
   *
   * @default []
   */
  scales: number[];

  /**
   * The base component data object that defines the component to be instanced at each position.
   * This is the data of any component that supports batch drawing (e.g., a model component).
   * Each instance in the batch will be a copy of this preset placed at the transforms defined
   * by `positions`, `rotations`, and `scales`.
   *
   * The preset may include a `collider` sub-object to enable physics collisions on each instance.
   *
   * Set to `null` to create a batch with no preset (instances will not be rendered until a preset is assigned).
   *
   * @default null
   */
  preset: any;

  /**
   * When `true`, uses an octree-based spatial sorting structure for efficient rendering of
   * static instances at runtime via GPU instancing. Best suited for large numbers of instances
   * that do not move after creation.
   *
   * @default true
   */
  useOctreeSorting: boolean;

  /**
   * When `true` and `useOctreeSorting` is enabled, displays a debug visualization of the
   * octree spatial structure at runtime.
   *
   * @default false
   */
  debug: boolean;
}
