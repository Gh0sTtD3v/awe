// @ts-check

import {
  Component3D,
  DataChangeOpts,
} from "../../abstract/component-3d";
import { GodrayFactory } from "../../../internal/godray";
import { GodrayComponentData } from "./godray-data";

import InstancedMeshWrapper from "../../../internal/pipeline/instance-mesh-wrapper";
export type { GodrayComponentData } from "./godray-data";

/**
 * @public
 *
 * A component that renders volumetric light rays (godrays) in the scene. Godrays simulate
 * beams of light shining through the environment, creating a dramatic atmospheric lighting
 * effect. The effect supports customization of color, opacity, and standard 3D transforms
 * (position, rotation, scale). The y-axis scale controls the height/length of the light beams.
 *
 * See {@link GodrayComponentData} for the data schema used to configure a godray component.
 *
 * @example
 * ```ts
 * // Basic usage — add a godray with default white light
 * const godray = await space.components.create({
 *   type: "godray",
 *   position: { x: 0, y: 5, z: 0 },
 * });
 * ```
 *
 * @example
 * ```ts
 * // Golden godray with reduced opacity and taller beams
 * const godray = await space.components.create({
 *   type: "godray",
 *   position: { x: 5, y: 0, z: -3 },
 *   rotation: { x: 0, y: 0, z: 15 },
 *   scale: { x: 1, y: 20, z: 1 },
 *   color: 0xffd700,
 *   opacity: 0.6,
 * });
 * ```
 */
export class GodrayComponent extends Component3D<GodrayComponentData> {
  //
  private _factory: GodrayFactory = null;

  private _godray: InstancedMeshWrapper = null;

  /**
   * @internal
   */
  constructor(opts) {
    //
    super(opts);

    this._factory = opts.godrayFactory;
  }

  /** @internal */
  protected async init() {
    //
    const { position, rotation, scale, ...opts } = this.data;

    this._godray = await this._factory.get(this.opts.space, opts);

    this._godray.attachTo(this);

    this._update3D();
  }

  /** @internal */
  private _update3D() {
    //
    this._godray.opacity = this.data.opacity;

    this._godray.color.set(this.data.color);

    // this._godray.setScale(scale.x, scale.y, scale.z);
  }

  /**
   * @internal
   */
  onDataChange(opts) {
    //
    this._update3D();
  }

  /**
   * @internal
   */
  protected _onCreateCollisionMesh() {
    //
    const collision = this._godray.buildCollisionMesh();

    collision.visible = false;

    this.add(collision);

    return collision;
  }

  /** @internal */
  protected dispose() {
    //
    this._godray.remove();
  }
}
