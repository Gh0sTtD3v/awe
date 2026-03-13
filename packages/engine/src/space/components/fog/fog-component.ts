// @ts-check

import {
  Component3D,
  DataChangeOpts,
} from "../../abstract/component-3d";
import Fog from "../../../internal/fog";
import Shared from "../../../internal/utils/globals/shared";
import { FogComponentData } from "./fog-data";

export type { FogComponentData } from "./fog-data";

/**
 * Applies a linear distance-based fog effect to the scene. Objects between the {@link FogComponentData.near | near}
 * and {@link FogComponentData.far | far} distances from the camera gradually fade into the fog color, and objects
 * beyond `far` are fully obscured.
 *
 * This is a singleton component — only one fog can exist per scene. The fog color blends with the
 * scene's background component.
 *
 * The `near` and `far` properties can be adjusted at runtime via their getters and setters to
 * dynamically control fog density.
 *
 * @example
 * // Basic fog setup
 * const fog = await space.components.create({
 *     type: "fog",
 *     enabled: true,
 *     near: 300,
 *     far: 500,
 *     fadeColor: "#054d73"
 * });
 *
 * @example
 * // Close fog for a dense, atmospheric effect
 * const fog = await space.components.create({
 *     type: "fog",
 *     enabled: true,
 *     near: 0,
 *     far: 40,
 *     fadeColor: "#cccccc"
 * });
 *
 * @example
 * // Adjust fog distance at runtime
 * const fog = space.components.byType("fog")[0];
 * fog.near = 50;
 * fog.far = 200;
 *
 * @public
 */
export class FogComponent extends Component3D<FogComponentData> {
  //
  /** @internal */
  _fog: any;

  /** @internal */
  protected async init() {
    //
    this._update3D();
  }

  /**
   * @internal
   */
  onDataChange(opts: DataChangeOpts<FogComponentData>): void {
    if (opts.prev.enabled !== this.data.enabled) {
      this._update3D();
      return;
    }

    if (this._fog == null) return;

    this._fog.near = this.data.near;
    this._fog.far = this.data.far;

    if (opts.prev.fadeColor !== this.data.fadeColor) {
      this._fog.fogFadeColor.set(this.data.fadeColor);
      Shared.fogFadeColor.value.copy(this._fog.fogFadeColor);
    }
  }

  private _update3D() {
    //
    this._fog = Fog.get(
      this.container.background._background?.getRaw(),
      this.data,
      0,
    );

    this.space.scene.fog = this._fog;
  }

  /** @internal */
  protected dispose() {
    //
    this._fog = null;

    this.space.scene.fog = null;
  }
}
