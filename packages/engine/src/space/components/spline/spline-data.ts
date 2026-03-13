import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for the {@link SplineComponent}. Defines a smooth curve in 3D space
 * through a series of control points, with optional visual styling and a follower system
 * for spawning components that move along the path.
 */
export interface SplineComponentData extends Component3DData {
  /**
   * @internal
   */
  kit?: "cyber";

  /**
   * The component type identifier. Must be `"spline"`.
   */
  type: "spline";

  /**
   * Optional unique identifier for the component. If not provided, an auto-generated
   * id will be assigned.
   */
  id?: string;

  /**
   * Display name for the component. Defaults to `""`.
   */
  name?: string;

  /**
   * Position of the component in the space. Defaults to `{x: 0, y: 0, z: 0}`.
   */
  position?: XYZ;

  /**
   * Rotation of the component in the space, in radians. Defaults to `{x: 0, y: 0, z: 0}`.
   */
  rotation?: XYZ;

  /**
   * Hex color string for the spline line (e.g. `"#ff0000"`). Defaults to `"#ffffff"`.
   */
  color?: string;

  /**
   * Number of interpolation subdivisions along the spline curve. Higher values produce
   * smoother curves at the cost of more geometry. Valid range: `4`–`2000`. Defaults to `1000`.
   */
  smoothness?: number;

  /**
   * A flat array of numbers representing 3D control points in
   * `[x1, y1, z1, x2, y2, z2, ...]` format. Each consecutive group of 3 values
   * defines one control point.
   *
   * Defaults to `[0, 0, 0, 3, 0, 3, -3, -3, 6, 3, 3, 9]` (4 control points).
   */
  points?: number[];

  /**
   * Whether the spline forms a closed loop. When `true`, the last point connects
   * back to the first. Defaults to `false`.
   */
  closed: boolean;

  /**
   * Component data object used as a template to spawn follower instances that move
   * along the spline path. The object should be a valid component data configuration
   * (e.g. a model or avatar component data). Set to `null` to disable followers.
   * Defaults to `null`.
   */
  preset: object;

  /**
   * Number of follower instances to spawn along the spline. Only used when
   * {@link preset} is set. Valid range: `1`–`40`. Defaults to `1`.
   */
  followerCount: number;

  /**
   * Maximum random offset applied to each follower's position relative to the spline
   * path, per axis. Creates variation so followers don't all follow the exact same line.
   * Each axis value range: `-10` to `10`. Defaults to `{x: 0, y: 0, z: 0}`.
   */
  followerOffsetVariation: XYZ;

  /**
   * Base movement speed of follower instances along the spline. Only used when
   * {@link preset} is set. Valid range: `0.01`–`5`. Defaults to `1`.
   */
  followerSpeed: number;

  /**
   * Maximum random speed variation added to each follower's base speed. Creates
   * variation so followers move at different rates. Valid range: `0.01`–`5`.
   * Defaults to `0`.
   */
  followerSpeedVariation: number;

  /**
   * Width of the rendered spline line. Valid range: `0.25`–`6`. Defaults to `3`.
   */
  lineWidth: number;

  /**
   * Opacity of the spline line. `0` is fully transparent, `1` is fully opaque.
   * Valid range: `0`–`1`. Defaults to `1`.
   */
  opacity: number;

  /**
   * Whether to display the spline line in live (non-editor) mode. When `false`,
   * the spline is only visible in the editor and is hidden at runtime.
   * Defaults to `false`.
   */
  display?: boolean;
}
