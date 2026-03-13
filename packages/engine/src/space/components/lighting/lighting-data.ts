import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link LightingComponent}. Configures a directional light with real-time shadow mapping
 * for the scene. The directional light simulates a distant light source (such as the sun) that casts parallel
 * shadows across the environment.
 *
 * This is a singleton component — only one lighting component can exist per space.
 *
 * The engine internally uses a **dual-light architecture** for shadow rendering:
 *
 * - A **static shadow light** that renders shadow maps for all non-dynamic scene geometry.
 *   This light only re-renders its shadow map when the scene geometry changes or component
 *   data is updated — not every frame. The {@link LightingComponentData.size | size},
 *   {@link LightingComponentData.near | near}, {@link LightingComponentData.far | far}, and
 *   {@link LightingComponentData.bias | bias} properties control this light's shadow camera frustum.
 *
 * - A **realtime shadow light** that renders shadow maps exclusively for dynamic-layer objects
 *   (e.g., avatars and moving entities). This light updates every frame and automatically follows
 *   the active camera to keep shadows centered around the player's view. Its shadow parameters are
 *   managed internally with fixed values.
 *
 * An **ambient light** is also managed automatically. Its intensity is reduced when shadow casting
 * is active to maintain balanced lighting and avoid overexposure.
 *
 * @remarks
 * The dual-light split is a performance optimization: static shadows avoid re-rendering the
 * full-scene shadow map every frame (which is expensive), while the realtime shadow light provides
 * responsive, per-frame shadows only for moving objects at a much lower cost.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface LightingComponentData extends Component3DData {
  /**
   * Component type discriminator. Must be `"lighting"`.
   */
  type: "lighting";

  /**
   * Unique identifier for the component. If not provided, an auto id will be generated.
   */
  id?: string;

  /**
   * Display name for the component. Defaults to `""`.
   */
  name?: string;

  /**
   * Whether the directional light and its shadows are enabled. When set to `false`, the light
   * and all shadow casting are removed from the scene. Defaults to `true`.
   */
  enabled?: boolean;

  /**
   * Direction vector of the light, controlling where the light points and where shadows fall.
   * Each component should be in the range `[-1, 1]`. The vector is normalized internally.
   *
   * For example, `{x: -1, y: -1, z: -1}` produces a light shining diagonally downward,
   * casting shadows away from the origin.
   *
   * Defaults to `{x: -1, y: -1, z: -1}`.
   */
  lightDirection?: XYZ;

  /**
   * World-space position of the directional light source. This determines the origin point
   * from which shadows are cast. The light should generally be positioned high above and
   * far from the scene to simulate a distant light source like the sun.
   *
   * Defaults to `{x: 200, y: 200, z: 200}`.
   */
  lightPosition?: XYZ;

  /**
   * Shadow bias offset applied to the shadow map depth. Adjusts the depth comparison to prevent
   * shadow rendering artifacts. A small negative value helps prevent shadow acne (dark stripes
   * on lit surfaces), but too much negative bias can cause peter panning (shadows detaching
   * from their casters).
   *
   * Valid range: `[-0.1, 0.1]`. Defaults to `-0.002`.
   */
  bias?: number;

  /**
   * Near clipping plane of the shadow camera frustum. Objects closer than this distance
   * to the light source will not cast shadows.
   *
   * Valid range: `[0, 3000]`. Defaults to `139.4`.
   */
  near?: number;

  /**
   * Far clipping plane of the shadow camera frustum. Objects farther than this distance
   * from the light source will not cast shadows.
   *
   * Valid range: `[0, 3000]`. Defaults to `513`.
   */
  far?: number;

  /**
   * Intensity of the directional light. Controls how bright the light appears in the scene.
   * A value of `0` means no light, and `1` means full intensity.
   *
   * Valid range: `[0, 1]`. Defaults to `1`.
   */
  intensity?: number;

  /**
   * Orthographic size of the shadow camera frustum in world units. Controls how large an area
   * the shadow map covers. Larger values cover more of the scene but reduce shadow resolution
   * and detail. Smaller values produce sharper shadows but cover a smaller area.
   *
   * Valid range: `[500, 4000]`. Defaults to `500`.
   */
  size?: number;
}
