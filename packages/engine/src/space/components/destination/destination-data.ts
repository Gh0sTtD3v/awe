import { Component3DData } from "../../abstract/component-3d-data";

/**
 * @public
 *
 * GLTF model URLs for each quality tier. The engine selects a URL at runtime
 * based on the detected GPU tier and whether the device supports compressed
 * textures.
 *
 * - GPU tier 0 → {@link low}
 * - GPU tier 1 → {@link mid}
 * - GPU tier 2+ → {@link high}
 * - Mobile with compressed texture support → {@link low_compressed} (if provided)
 */
export interface DestinationPaths {
  /** URL of the high-quality GLTF model (used on GPU tier 2+). */
  high: string;

  /** URL of the mid-quality GLTF model (used on GPU tier 1). */
  mid: string;

  /** URL of the low-quality GLTF model (used on GPU tier 0). */
  low: string;

  /**
   * URL of a compressed low-quality GLTF model used on mobile devices
   * that support compressed textures. When available, this overrides
   * the GPU-tier selection on mobile.
   */
  low_compressed?: string;
}

/**
 * @public
 *
 * Optional parameters that control placeholder geometry and artwork scaling
 * within a destination.
 */
export interface DestinationParams {
  /**
   * Size of artwork placeholder meshes as `[width, height, depth]`.
   *
   * Defaults to `[1, 1, 0.1]`.
   */
  placeholderSize?: [number, number, number];

  /**
   * Destination version flag. When set to `1`, placeholder meshes have their
   * scale forced to `(1, 1, 1)` instead of inheriting the world scale from
   * the GLTF node.
   */
  version?: number;

  /**
   * Scale divisor for artwork placed on placeholders. The final artwork
   * scale factor is computed as `200 / artworkScale`.
   *
   * Defaults to `15` (resulting in a scale factor of ~13.33).
   */
  artworkScale?: number;
}

/**
 * @public
 *
 * Configuration data for the destination component. A destination is a pre-built
 * 3D environment that serves as the base world for the game. It provides a complete
 * scene including collision geometry, portals for navigating between spaces,
 * placeholder positions for artwork placement, and portal animations.
 *
 * Destinations can be used to create virtual galleries, exhibition spaces, or any
 * pre-authored 3D environment.
 *
 * This is a **singleton** component — only one destination can exist per space.
 */
export interface DestinationComponentData extends Component3DData {
  /**
   * The component type identifier. Must be `"destination"`.
   */
  type: "destination";

  /**
   * Unique identifier for this component instance. If not provided, an auto-generated
   * id will be assigned.
   */
  id?: string;

  /**
   * Optional display name for the destination. Defaults to `""`.
   */
  name?: string;

  /**
   * GLTF model URLs for each quality tier. The engine selects the appropriate
   * URL at runtime based on the device's GPU capability and platform.
   *
   * See {@link DestinationPaths} for details on tier selection.
   */
  paths: DestinationPaths;

  /**
   * Optional parameters controlling placeholder geometry and artwork scaling.
   *
   * See {@link DestinationParams} for available options.
   */
  params?: DestinationParams;
}
