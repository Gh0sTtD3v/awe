// @ts-check

import { Vector3 } from "three";
import {
  Component3D,
  DataChangeOpts,
} from "../../abstract/component-3d";
import { CloudFactory } from "../../../internal/cloud";
import { CloudComponentData } from "./cloud-data";

export type { CloudComponentData } from "./cloud-data";

const temp = new Vector3();

/**
 * @public
 *
 * A component that renders decorative cloud visuals in the 3D scene. Clouds are
 * billboard-style sprites with configurable shape, opacity, and standard 3D transforms
 * (position, rotation, scale). Multiple cloud instances can be placed throughout a scene
 * to create atmospheric environments.
 *
 * See {@link CloudComponentData} for the data schema used to create a cloud component.
 *
 * @example
 * ```ts
 * // Basic usage — add a cloud at a specific position
 * const cloudData = {
 *   type: "cloud",
 *   position: { x: 0, y: 10, z: -20 },
 * };
 * const cloud = await space.components.create(cloudData);
 * ```
 *
 * @example
 * ```ts
 * // Customized cloud with a different shape, partial transparency, and larger scale
 * const cloudData = {
 *   type: "cloud",
 *   position: { x: 15, y: 12, z: -10 },
 *   scale: { x: 3, y: 3, z: 3 },
 *   atlas: 2,
 *   opacity: 0.7,
 * };
 * const cloud = await space.components.create(cloudData);
 * ```
 */
export class CloudComponent extends Component3D<CloudComponentData> {
  //
  private _factory: CloudFactory = null;

  private _cloud = null;

  /**
   * @internal
   */
  constructor(opts) {
    super(opts);

    this._factory = opts.cloudFactory;
  }

  /**
   * @internal
   */
  protected async init() {
    //
    const { position, rotation, scale, ...opts } = this.data;

    this._cloud = await this._factory.get(this.opts.space, opts);

    this._cloud.attachTo(this);

    this._update3D();
  }

  /**
   * @internal
   */
  private _update3D() {
    //
    // transform is automatically updated because the factory info has transform: true

    this._cloud.opacity = this.data.opacity;

    this._factory.setAtlas(this._cloud, this.data);

    // this._cloud.update(this.data);
  }

  /**
   * @internal
   */
  onDataChange(opts: DataChangeOpts): void {
    //
    this._update3D();
  }

  /**
   * @internal
   */
  getInstanceWrapper() {
    return this._cloud;
  }

  /**
   * @internal
   */
  collision = null;

  /**
   * @internal
   */
  // onCollisionCallback = (player, collision) => {
  //     // console.log( collision, Date.now())

  //     if (collision.normal1.y > 0.95) {
  //         this.getWorldDirection(temp);

  //         const factor = 0.5;

  //         temp.multiplyScalar(factor);

  //         player.setForce(
  //             { x: temp.x, y: temp.y, z: temp.z },
  //             {
  //                 dampling: 0.05,
  //                 once: true,
  //             }
  //         );
  //     }

  //     // }
  // };

  /**
   * @internal
   */
  // getCollisionMesh() {
  //     if (this.collision == null) {
  //         this.collision = this._cloud.buildCollisionMesh();

  //         this.collision.visible = false;

  //         this.add(this.collision);
  //     }

  //     return this.collision;
  // }

  /**
   * @internal
   */
  protected dispose() {
    //
    this._cloud.mesh.remove(this._cloud);
  }
}
