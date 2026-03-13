import { Component3DData } from "../../abstract/component-3d-data";

/**
 * @public
 *
 * Configuration data for the {@link RainComponent}. Configures a rain weather particle effect
 * that covers the scene. This is a singleton component — only one rain component may exist
 * per space.
 */
export interface RainComponentData extends Component3DData {
  /**
   * Component type discriminator. Must be `"rain"`.
   */
  type: "rain";

  /**
   * Optional unique identifier for this component. If not provided, an auto-generated
   * id will be used.
   */
  id?: string;

  /**
   * Optional display name for the component. Defaults to `""`.
   */
  name?: string;

  /**
   * Controls the visual density and opacity of the rain particles. A value of `0`
   * produces invisible rain, while `1` produces rain at full opacity. Values greater
   * than `1` are allowed and increase opacity further. Defaults to `0.5`.
   */
  intensity?: number;
}
