import { Component3DData } from "../../abstract/component-3d-data";

/**
 * Configuration data for {@link FogComponent}.
 *
 * Configures a linear distance-based fog effect for the scene. Objects between the `near` and `far`
 * distances from the camera gradually fade into the fog color, and objects beyond `far` are fully
 * obscured. This is useful for creating atmosphere, hiding distant geometry edges, and simulating
 * outdoor environments.
 *
 * Only one fog component can exist per scene (singleton).
 *
 * @public
 */
export interface FogComponentData extends Component3DData {
  /**
   * Component type identifier. Must be `"fog"`.
   */
  type: "fog";

  /**
   * Optional identifier for the component. If not provided, an auto id will be generated.
   */
  id?: string;

  /**
   * Optional name for the component. Defaults to `""`.
   */
  name?: string;

  /**
   * Whether the fog effect is active. When set to `false`, no fog is applied to the scene.
   *
   * Defaults to `true`.
   */
  enabled?: boolean;

  /**
   * The distance from the camera at which the fog effect begins. Objects closer than this
   * distance are fully visible with no fog applied. Can be negative to start the fog
   * behind the camera. Valid range in the studio editor is -100 to 2900.
   *
   * Defaults to `300`.
   */
  near?: number;

  /**
   * The distance from the camera at which the fog is fully opaque. Objects beyond this
   * distance are completely obscured by the fog color. Valid range in the studio editor
   * is 0 to 3000. Must be greater than `near` for the fog to be visible.
   *
   * Defaults to `500`.
   */
  far?: number;

  /**
   * The color of the fog, specified as a CSS hex color string (e.g., `"#054d73"`).
   * This determines the color that distant objects fade into.
   *
   * Defaults to `"#054d73"`.
   */
  fadeColor?: string;
}
