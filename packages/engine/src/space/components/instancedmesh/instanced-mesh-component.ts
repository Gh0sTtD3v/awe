// @ts-check

import { Component3D } from "../../abstract/component-3d";

export type {
  InstancedMeshComponentData,
  InstancedMeshSpawnData,
  InstancedMeshInstance,
  InstancedMeshPlugin,
} from "./instanced-mesh-component-data";

import {
  InstancedMeshComponentData,
  InstancedMeshSpawnData,
  InstancedMeshInstance,
} from "./instanced-mesh-component-data";

import { InstancedMeshFactory } from "../../../internal/instancedmesh";

import { DisposePipelinesMeshes } from "../../../internal/utils/dispose";
import { Vector3 } from "three";

/**
 * @public
 *
 * A component that enables GPU-instanced rendering of many copies of a single mesh. Instead of
 * creating individual mesh objects for each copy, this component batches them into a single draw
 * call, providing significant performance gains when rendering large numbers of identical objects
 * (e.g., vegetation, debris, projectiles, particles).
 *
 * This component is not serializable (baseMesh data property is not serializable). It can be created only at runtime.
 *
 * Instances are managed through a spawn/update/kill lifecycle:
 * - Use {@link InstancedMeshComponent.spawn | spawn()} to create a new instance with its own transform, color, and opacity.
 * - Use {@link InstancedMeshComponent.wrapperUpdate | wrapperUpdate()} to synchronize changes after modifying a spawned instance's properties.
 * - Use {@link InstancedMeshComponent.killWrapper | killWrapper()} to remove an instance.
 *
 * Each instance can have independent position, rotation, scale, color, opacity, and texture atlas UV values,
 * controlled through the wrapper object returned by `spawn()`.
 *
 * The component supports optional per-instance frustum culling, transparency sorting, and custom
 * shader plugins. See {@link InstancedMeshComponentData} for the full data schema.
 *
 * @example
 * ```typescript
 * // Create an instanced mesh component from an existing Three.js mesh
 * const instancedComp = await space.components.create({
 *     type: "instancedmesh",
 *     baseMesh: myThreeJsMesh,
 *     opacity: true,
 *     useNormal: true,
 *     useGeometryColor: false,
 *     color: true,
 *     atlas: false,
 *     transparencySorting: true,
 *     shadow: "none",
 *     plugins: [],
 *     useFrustumCulling: true,
 *     useSorting: true,
 * });
 *
 * // Spawn instances at different positions
 * const instance1 = instancedComp.spawn({
 *     position: { x: 0, y: 0, z: 0 },
 *     rotation: { x: 0, y: 0, z: 0 },
 *     scale: { x: 1, y: 1, z: 1 },
 *     opacity: 1,
 *     color: [1, 0, 0], // red
 * });
 *
 * const instance2 = instancedComp.spawn({
 *     position: { x: 5, y: 0, z: 3 },
 *     scale: { x: 2, y: 2, z: 2 },
 *     opacity: 0.5,
 * });
 *
 * // Update an instance's position and sync with GPU buffer
 * instance1.position.x = 10;
 * instance1.position.y = 2;
 * instancedComp.wrapperUpdate(instance1);
 *
 * // Remove an instance when no longer needed
 * instancedComp.killWrapper(instance2);
 * ```
 */
export class InstancedMeshComponent extends Component3D<InstancedMeshComponentData> {
  private _instancedMesh = null;

  private _factory: InstancedMeshFactory = null;

  /**
   * @internal
   */
  constructor(opts) {
    super(opts);

    this._factory = opts.instancedMeshFactory;
  }

  /**
   * @internal
   */
  async init() {
    //

    this._instancedMesh = await this._factory.get(this.opts.space, this.data);

    // this.add(this._circle);

    // debugger;

    //this._instancedMesh.attachTo(this)

    await this.update3D();
  }

  /**
   * @internal
   */
  collision = null;

  /**
   * @internal
   */
  onCollisionCallback = (player, collision) => {};

  /**
   * Spawns a new instance in the instanced mesh. The instance is immediately added to the
   * GPU buffer and will be rendered on the next frame.
   *
   * @param data - Configuration for the new instance:
   *   - `position` - The world position of the instance as `{x, y, z}`.
   *   - `rotation` - The Euler rotation of the instance as `{x, y, z}` (in radians).
   *   - `rotationY` - Shorthand Y-axis rotation (in radians). Use instead of `rotation` when only Y rotation is needed.
   *   - `scale` - The scale of the instance as `{x, y, z}`.
   *   - `opacity` - The opacity of the instance (0–1). Requires `opacity: true` in the component data.
   *   - `color` - The color of the instance as `[r, g, b]` (0–1 per channel). Requires `color: true` in the component data.
   *   - `atlas` - Texture atlas UV region as `{x, y, z, w}`. Requires atlas to be enabled in the component data.
   *
   * @returns An instance wrapper object. Store this reference to later update or remove the instance
   *          via {@link wrapperUpdate} and {@link killWrapper}. The wrapper exposes mutable properties
   *          such as `position`, `rotation`, `scale`, `opacity`, and `color`.
   */
  spawn(data: InstancedMeshSpawnData): InstancedMeshInstance {
    return this._instancedMesh.add(data);
  }

  /**
   * Queues an instance wrapper for GPU buffer synchronization. Call this after directly modifying
   * properties on a wrapper object (e.g., `wrapper.position.x = 10`) so the changes are written
   * to the GPU buffer on the next frame.
   *
   * @param wrapper - The instance wrapper object previously returned by {@link spawn}.
   */
  wrapperUpdate(wrapper: InstancedMeshInstance): void {
    this._instancedMesh.wrapperUpdate(wrapper);
  }

  /**
   * Removes an instance from the instanced mesh. The instance is removed from the GPU buffer
   * and will no longer be rendered. After calling this method, the wrapper object should not
   * be reused.
   *
   * @param wrapper - The instance wrapper object previously returned by {@link spawn}.
   */
  killWrapper(wrapper: InstancedMeshInstance): void {
    this._instancedMesh.remove(wrapper);
  }

  /**
   * @internal
   */
  async update3D() {}

  /**
   * @internal
   */
  getCollisionMesh() {
    if (this.collision == null) {
    }

    return this.collision;
  }

  /**
   * @internal
   */
  dispose() {
    // ignore maps..

    // they might be used somewhere else..

    DisposePipelinesMeshes(this._instancedMesh, true);

    if (this._instancedMesh) {
      if (this._instancedMesh.parent) {
        this._instancedMesh.parent.remove(this._instancedMesh);
      }

      this._instancedMesh?.geometry?.dispose();

      this._instancedMesh?.dispose();

      this._instancedMesh = null;
    }

    //this._factory.disposeAll()

    this._instancedMesh = null;

    this._factory = null;
  }
}
