// @ts-check

import {
  Component3D,
  DataChangeOpts,
} from "../../abstract/component-3d";
import {
  Object3D,
  Mesh,
  BufferGeometry,
  Matrix4,
  BufferAttribute,
  MeshBasicMaterial,
} from "three";
import { mergeBufferGeometries } from "../../../internal/utils/geometry";
import { disposeThreeResources } from "../../../internal/utils/dispose";
/**
 * @public
 *
 * A component that wraps a Three.js `Object3D` with full {@link Component3D}
 * capabilities — including collision mesh generation, interaction handling,
 * physics, and transform management.
 *
 * NOTE: Do not use this component to wrap other Components3D, use the GroupComponent instead.
 *
 * When an `Object3D` is provided via the `object` data property, the component
 * automatically attaches it to the scene and derives a collision mesh from its
 * geometry. This makes it the primary way to integrate externally-created 3D
 * objects into the engine's component system.
 *
 * The component can also be used without an `object` to create behavior-only
 * nodes — for example, script hosts, control logic containers, or empty parent
 * nodes for grouping child components.
 *
 * Because it extends {@link Component3D}, all standard component features are
 * available — including physics colliders, events, transform manipulation.
 *
 * This component is not serializable (object data property is not serializable). It can be created only at runtime.
 *
 * @example
 * ```ts
 * // Wrap an existing Object3D with Component3D facilities
 * import { BoxGeometry, MeshStandardMaterial, Mesh } from "three";
 *
 * const mesh = new Mesh(
 *   new BoxGeometry(1, 1, 1),
 *   new MeshStandardMaterial({ color: 0x00ff00 })
 * );
 *
 * const obj = await space.components.create({
 *   type: "object",
 *   name: "CustomBox",
 *   object: mesh,
 *   collider: { enabled: true }
 * });
 * // The component now has auto-generated collision and interaction
 * ```
 *
 * @example
 * ```ts
 * // Create an empty object component to host game logic
 * const obj = await space.components.create({
 *   id: "...",
 *   type: "object",
 *   name: "GameController",
 *   position: { x: 0, y: 0, z: 0 },
 * });
 *
 * // Access it later by identifier
 * const controller = space.components.byId("game-controller");
 * ```
 */
export class ObjectComponent extends Component3D {
  /**
   * The Three.js Object3D instance attached to this component. Initially `null`
   * unless an object is provided in the component data. Can be used to attach
   * custom 3D objects to this otherwise empty component.
   */
  object: Object3D = null;

  /**
   * @internal
   */
  async init() {
    //
    if (this.data.object) {
      this.object = this.data.object;
      this.add(this.object);
    }

    this.update3D();
  }

  /**
   * @internal
   */

  /**
   * @internal
   */
  onDataChange(opts: DataChangeOpts): void {
    //
    this.update3D();
  }

  /**
   * @internal
   */
  update3D() {
    //
  }

  /**
   * @internal
   */
  _collisionMesh: Mesh = null;

  /**
   * @internal
   */
  getCollisionMesh() {
    if (this._collisionMesh == null) {
      this._collisionMesh =
        this.data.collisionMesh ?? this._buildCollisionMesh();
    }
    return this._collisionMesh;
  }

  private _buildCollisionMesh() {
    //
    if (this.object == null) {
      return;
    }

    //
    const matParentInv = new Matrix4();

    if (this.object.parent) {
      matParentInv.copy(this.object.parent.matrixWorld).invert();
    }

    let geometries = [];

    this.object.updateMatrixWorld(true);

    this.object.traverse((child) => {
      if (child instanceof Mesh) {
        //
        child.updateMatrixWorld();
        const geom = child.geometry.clone();
        geom.applyMatrix4(child.matrixWorld);
        geom.applyMatrix4(matParentInv);
        geometries.push(geom);
      }
    });

    if (geometries.length == 0) {
      return;
    }

    const mergedGeometry = mergeBufferGeometries(geometries, false, {
      forceList: ["position"],
      ignoreMorphTargets: true,
    });

    const mesh = new Mesh(
      mergedGeometry,
      new MeshBasicMaterial({ color: 0xff00ff, wireframe: true }),
    );

    this._collisionMesh = mesh;

    // Scene.add(mesh);

    return mesh;
  }

  /**
   * @internal
   */
  dispose() {
    //
    if (this.object) {
      disposeThreeResources(this.object);
      this.remove(this.object);
      this.object = null;
    }

    if (this._collisionMesh) {
      disposeThreeResources(this._collisionMesh);
      this._collisionMesh = null;
    }
  }
}
