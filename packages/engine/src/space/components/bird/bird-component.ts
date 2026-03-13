import { Vector3 } from "three";
import {
  Component3D,
  DataChangeOpts,
} from "../../abstract/component-3d";
import { BirdFactory } from "../../../internal/bird";
import { BirdComponentData } from "./bird-data";
import InstancedMeshWrapper from "../../../internal/pipeline/instance-mesh-wrapper";
export type { BirdComponentData } from "./bird-data";

const temp = new Vector3();

/**
 * @public
 *
 * A component that renders animated birds (butterflies) in the scene using GPU-instanced meshes.
 * The birds follow circular flight paths with wing-flapping animation. Supports customization
 * of color, opacity, scale, and standard 3D transforms (position, rotation).
 *
 * See {@link BirdComponentData} for the data schema used to create a bird component.
 *
 * @example
 * ```ts
 * // Basic usage — add a bird at a specific position
 * const birdData = {
 *   type: "bird",
 *   position: { x: 0, y: 5, z: 0 },
 * };
 * const bird = await space.components.create(birdData);
 * ```
 *
 * @example
 * ```ts
 * // Customized bird with red tint and partial transparency
 * const birdData = {
 *   type: "bird",
 *   position: { x: 10, y: 8, z: -5 },
 *   scale: { x: 2, y: 2, z: 2 },
 *   color: 0xff4444,
 *   opacity: 0.8,
 * };
 * const bird = await space.components.create(birdData);
 * ```
 */
export class BirdComponent extends Component3D<BirdComponentData> {
  //
  private _factory: BirdFactory = null;

  private _bird: InstancedMeshWrapper = null;

  /**
   * @internal
   */
  constructor(opts) {
    super(opts);

    this._factory = opts.birdFactory;
  }

  /** @internal */
  protected async init() {
    //
    const { position, rotation, scale, opacity, ...opts } = this.data;

    this._bird = await this._factory.get(this.opts.space, opts);

    this._bird.attachTo(this);

    this._update3D();
  }

  /** @internal */
  private _update3D() {
    //
    const { scale, opacity } = this.data;

    this._bird.opacity = opacity;

    this._bird.scale.set(scale.x, scale.y, scale.z);
  }

  /**
   * @internal
   */
  onDataChange(opts: DataChangeOpts): void {
    this._update3D();
  }

  /** @internal */
  protected _onCreateCollisionMesh() {
    //
    // const collision = this._bird.buildCollisionMesh();

    // collision.visible = false;

    // this.add(collision);

    // return collision;

    return null;
  }

  /** @internal */
  protected dispose() {
    //
    this._bird.mesh.remove(this._bird);
  }
}
