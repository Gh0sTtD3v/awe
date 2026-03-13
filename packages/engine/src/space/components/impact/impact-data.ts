import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link ImpactComponent}.
 *
 * Configures a visual impact effect component that renders short-lived, billboarded
 * sprite bursts at specified positions in the scene. Impact effects are commonly used
 * to indicate hits, collisions, or other point-of-contact visual feedback.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface ImpactComponentData extends Component3DData {
  /**
   * @internal
   */
  kit?: "cyber";

  /**
   * Component type discriminator. Must be `"impact"`.
   */
  type: "impact";

  /**
   * Optional unique identifier for this component. If not provided, one will be
   * auto-generated.
   */
  id?: string;

  /**
   * Optional display name for this component.
   *
   * @defaultValue `""`
   */
  name?: string;

  /**
   * Color of the impact effect.
   *
   * @defaultValue `0xff0000` (red)
   */
  color?: number;

  /**
   * Base scale multiplier for impact sprites. Each spawned sprite's size is
   * randomized around this value.
   *
   * @defaultValue `1`
   */
  scale?: number;
}
