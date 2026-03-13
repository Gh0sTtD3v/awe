// @ts-check

import RainFactory from "../../../internal/rain";
import { Component3D } from "../../abstract/component-3d";
import type RainMesh from "../../../internal/rain/rain";
import { DisposePipelinesMeshes } from "../../../internal/utils/dispose";
import { RainComponentData } from "./rain-data";

export type { RainComponentData } from "./rain-data";

/**
 * @public
 *
 * Renders a rain weather particle effect that covers the entire scene. The rain
 * intensity (density/opacity of particles) can be configured at creation time and
 * updated at runtime via {@link Component3D.setData}.
 *
 * This is a singleton component — only one rain component may exist per space.
 *
 * The component type for creation is `"rain"`.
 *
 * See {@link RainComponentData} for the full data schema.
 *
 * @example
 * ```ts
 * // Add rain with default intensity (0.5)
 * const rain = await space.components.create({
 *   type: "rain",
 * });
 * ```
 *
 * @example
 * ```ts
 * // Add heavy rain
 * const rain = await space.components.create({
 *   type: "rain",
 *   intensity: 0.9,
 * });
 *
 * // Later, reduce rain to a light drizzle
 * rain.setData({ intensity: 0.2 });
 * ```
 */
export class RainComponent extends Component3D<RainComponentData> {
  //
  #rain: RainMesh = null;

  /**
   * @internal
   */
  protected async init() {
    this.#rain = RainFactory.get(this.data);

    this.add(this.#rain);
  }

  /**
   * @internal
   */
  onDataChange() {
    this.#rain.intensity = this.data.intensity;
  }

  /**
   * @internal
   */
  protected dispose() {
    DisposePipelinesMeshes(this.#rain);

    this.#rain.dispose();

    this.#rain = null;
  }
}
