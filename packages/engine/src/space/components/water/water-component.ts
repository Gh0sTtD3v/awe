// @ts-check

import {
  Component3D,
  DataChangeOpts,
} from "../../abstract/component-3d";

import WaterFactory from "../../../internal/water";
import { WaterComponentData } from "./water-data";

export type { WaterComponentData } from "./water-data";

/**
 * @public
 *
 * Renders a flat animated water surface in the 3D scene. The water plane
 * supports configurable color tinting, opacity, and 2D scaling (width and
 * depth). Color and opacity can be updated at runtime via
 * {@link Component3D.setData}.
 *
 * This is a singleton component — only one water component may exist per
 * space. Adding both a water component and a
 * {@link ReflectorComponent | reflector component} to the same space is not
 * supported for performance reasons.
 *
 * See {@link WaterComponentData} for the full data schema.
 *
 * @example
 * ```ts
 * // Add a water plane with default settings
 * const water = await space.components.create({
 *   type: "water",
 *   opacity: 1,
 * });
 * ```
 *
 * @example
 * ```ts
 * // Add a custom water plane with specific color and dimensions
 * const water = await space.components.create({
 *   type: "water",
 *   color: "#0044AA",
 *   opacity: 0.8,
 *   position: { x: 0, y: 2, z: 0 },
 *   scale: { x: 2000, z: 2000 },
 * });
 *
 * // Later, make the water more transparent
 * water.setData({ opacity: 0.4 });
 *
 * // Change the water color at runtime
 * water.setData({ color: "#003366" });
 * ```
 */
export class WaterComponent extends Component3D<WaterComponentData> {
  private _water = null;

  /**
   * @internal
   */
  protected async init() {
    //
    this._water = WaterFactory.get({
      ...this.data,
      position: { x: 0, y: 0, z: 0 },
    });

    this.add(this._water);

    this._update3D();
  }

  /**
   * @internal
   */
  syncWithTransform(isProgress = false) {
    //
    this._assignXYZ("position", this.position);

    this._assignXYZ("rotation", this.rotation);
  }

  /**
   * @internal
   */
  onDataChange(opts: DataChangeOpts): void {
    this._update3D();
  }

  private _update3D() {
    //
    this.position.copy(this.data.position as any);

    this._water.scale.x = this.data.scale.x;

    this._water.scale.y = this.data.scale.z;

    this._water.opacity = this.data.opacity;

    this._water.color = this.data.color;
  }

  /**
   * @internal
   */
  getCollisionMesh() {
    return this._water;
  }

  /**
   * @internal
   */
  protected dispose() {
    this.remove(this._water);

    this._water.dispose();
  }
}
