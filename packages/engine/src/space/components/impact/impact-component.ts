// @ts-check

import { Component3D } from "../../abstract/component-3d";

import { ImpactFactory } from "../../../internal/impact";

// import { disposeThreeResources } from "../../../internal/utils/dispose";
import { ImpactComponentData } from "./impact-data";
export type { ImpactComponentData } from "./impact-data";

/**
 * @public
 *
 * A component that renders short-lived visual impact effects in the 3D scene.
 *
 * Impact effects are billboarded sprite bursts that appear at a specified world position,
 * with randomized rotation and slight positional offset for visual variety. Each effect
 * is automatically removed after a brief duration. This is useful for indicating hits,
 * collisions, footsteps, or other point-of-contact feedback.
 *
 * See {@link ImpactComponentData} for the data schema used to configure this component.
 *
 * @example
 * ```javascript
 * // Create an impact component with custom color and scale
 * const impact = await space.components.create({
 *     type: "impact",
 *     color: 0xffaa00, // orange impact flashes
 *     scale: 1.5,      // larger sprites
 * });
 *
 * // Trigger an impact effect at a specific world position
 * impact.impact({ x: 5, y: 0, z: 10 });
 *
 * // Trigger impact at a collision point
 * someComponent.onCollisionEnter((event) => {
 *     const contactPoint = event.contactPoint;
 *     impact.impact({
 *         x: contactPoint.x,
 *         y: contactPoint.y,
 *         z: contactPoint.z,
 *     });
 * });
 * ```
 */
export class ImpactComponent extends Component3D<ImpactComponentData> {
  private _factory: ImpactFactory = null;

  private _impact = null;

  /**
   * @internal
   */
  constructor(opts) {
    super(opts);

    this._factory = opts.impactFactory;
  }

  /**
   * @internal
   */
  async init() {
    this._impact = await this._factory.get(this.data);

    if (this._factory.mesh.parent == null) {
    }

    this.add(this._factory.mesh as any);

    this.container.add(this);

    return this._impact;
  }

  /**
   * Triggers a visual impact effect at the specified world position.
   *
   * Spawns a short-lived billboarded sprite at the given coordinates with slight
   * random offset and rotation for visual variety. The sprite is automatically
   * removed after a brief duration.
   *
   * @param position - The world-space position where the impact effect should appear,
   *                   as an object with `x`, `y`, and `z` number properties.
   */
  impact(position) {
    this._impact.impact(position);
  }
  /**
   * @internal
   */
  dispose() {
    this._impact.dispose();
  }
}
