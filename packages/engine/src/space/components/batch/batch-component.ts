// @ts-check

import { Box3, Euler, Matrix4, Object3D, Quaternion, Vector3 } from "three";
import { Component3D, DataChangeOpts } from "../../abstract/component-3d";
import { BatchComponentData } from "./batch-data";
export type { BatchComponentData } from "./batch-data";
import { IS_EDIT_MODE, SET_SHADOW_NEEDS_UPDATE } from "../../../internal/constants";
import OctreeSorter from "../../../internal/rendering/libraries/sorters/octree";
import InstancedMeshWrapper from "../../../internal/pipeline/instance-mesh-wrapper";
import { cloneXYZ } from "../../../internal/utils/js";

/**
 * @public
 *
 * A component that renders multiple instances of a single base component ("preset") at different
 * positions, rotations, and scales for optimized rendering. Instead of creating many individual
 * components, BatchComponent groups them together and can leverage GPU instancing when octree
 * sorting is enabled, significantly reducing draw calls for large numbers of static objects
 * such as trees, rocks, or decorations.
 *
 * The base component to instance is defined by the `preset` property in {@link BatchComponentData}.
 * Per-instance transforms are stored as flat arrays (`positions`, `rotations`, `scales`) where
 * every 3 consecutive values correspond to one instance.
 *
 * See {@link BatchComponentData} for the data schema used to create a batch component.
 *
 * @example
 * // Create a batch of 3 trees at different positions and rotations
 * const treeBatch = await space.components.create({
 *   type: "batch",
 *   name: "Forest Trees",
 *   preset: {
 *     type: "model",
 *     url: "https://example.com/tree.glb",
 *     collider: { enabled: true, colliderType: "MESH" }
 *   },
 *   positions: [
 *     0, 0, 0,      // Instance 1 at origin
 *     5, 0, 3,      // Instance 2
 *     -3, 0, 7,     // Instance 3
 *   ],
 *   rotations: [
 *     0, 0, 0,      // No rotation
 *     0, 1.57, 0,   // Rotated 90° around Y
 *     0, 0.78, 0,   // Rotated 45° around Y
 *   ],
 *   scales: [
 *     1, 1, 1,      // Normal size
 *     1.2, 1.2, 1.2, // Slightly larger
 *     0.8, 0.8, 0.8, // Slightly smaller
 *   ],
 *   useOctreeSorting: true,
 *   debug: false,
 * });
 *
 * @example
 * // Create a batch of rocks without physics colliders
 * const rockBatch = await space.components.create({
 *   type: "batch",
 *   name: "Scattered Rocks",
 *   preset: {
 *     type: "model",
 *     url: "https://example.com/rock.glb",
 *   },
 *   positions: [10, 0, 5, -8, 0, 12, 3, 0, -4],
 *   rotations: [0, 0, 0, 0, 2.1, 0, 0, 0.5, 0],
 *   scales: [1, 1, 1, 0.6, 0.6, 0.6, 1.5, 1.5, 1.5],
 *   useOctreeSorting: true,
 *   debug: false,
 * });
 */
export class BatchComponent extends Component3D<BatchComponentData> {
    /**
     * @internal
     */
    grassLost = [];

    /**
     * @internal
     */
    _factory: any = null;

    /**
     * @internal
     */
    _baseComponent: Component3D = null;

    /**
     * @internal
     */
    _baseInstancedWrapper: InstancedMeshWrapper = null;

    /**
     * @internal
     */
    octreeHelper = null;
    // _batchInstance = null;
    // _baseMesh = null;

    private _wrappers: InstancedMeshWrapper[] = [];

    /**
     * @internal
     */
    _instances: Component3D[] = [];

    private _colliderOpts = [];

    /**
     * @internal
     */
    async init() {

        //
        await this.setPreset(this.data.preset);


        if (
            !IS_EDIT_MODE &&
            this._baseInstancedWrapper != null &&
            this.data.useOctreeSorting
        ) {
            //
            if (this.parent || !this.data.parentId) {
                //
                this._initInstanced(this._baseInstancedWrapper);
            } else {

            }

            this.once(this.EVENTS.ATTACHED, () =>
                this._initInstanced(this._baseInstancedWrapper)
            ); 
            //
        } else {
            //
            await this._syncInstances();
        }
    }

    /**
     * @internal
     */
    async _initInstanced(wrapper: InstancedMeshWrapper) {
        //
        this.updateWorldMatrix(true, false);

        if (this.data.useOctreeSorting == true) {
            //
            if (wrapper.sorter == null) {
                //
                const sorter = new OctreeSorter();

                wrapper.sorter = sorter;

                sorter.needsBuild = true;

                if (this.data.debug) {
                    this.octreeHelper = await sorter.getHelper();
                }
            }
        }

        const length = this.data.positions.length / 3;

        for (let i = 0; i < length; i++) {
            //
            const transform = this._computeWorldTransforms(i);

            if (this.data.preset.collider?.enabled == true) {
                //
                const spread = { ...this.data.preset.collider };

                if (this.getCollisionMesh() != null) {
                    spread.colliderMesh = this.getCollisionMesh().clone();

                    spread.colliderMesh.position.copy(transform.position);
                    spread.colliderMesh.rotation.copy(transform.rotation);
                    spread.colliderMesh.scale.copy(transform.scale);
                }

                this._colliderOpts.push(spread);
            }

            const { position, rotation, scale } = transform;

            const item = wrapper.mesh.add({
                position: [position.x, position.y, position.z],
                rotation: [rotation.x, rotation.y, rotation.z],
                scale: [scale.x, scale.y, scale.z],
            });

            this._wrappers.push(item);
        }

        SET_SHADOW_NEEDS_UPDATE(true);
    }

    // _updateInstanced() {
    //     //
    //     if (!this._wrappers.length) return;

    //     this.updateWorldMatrix(true, false);

    //     for (let i = 0; i < this._wrappers.length; i++) {
    //         //
    //         const wrapper = this._wrappers[i];
    //         const transform = this._computeWorldTransforms(i);
    //         wrapper.updateFromSource(transform);
    //     }

    //     if (this._baseInstancedWrapper.sorter != null) {
    //         //
    //         this._baseInstancedWrapper.sorter.needsBuild = true;
    //     }
    // }

    private _computeWorldTransforms(index: number) {
        //
        this._dataToTransform(this.data, index, tmpPos, tmpEuler, tmpScale);

        tmpQuat.setFromEuler(tmpEuler);
        tmpMat.compose(tmpPos, tmpQuat, tmpScale);
        tmpMat.premultiply(this.matrixWorld);
        tmpMat.decompose(tmpPos, tmpQuat, tmpScale);
        tmpEuler.setFromQuaternion(tmpQuat);

        return {
            position: tmpPos,
            quaternion: tmpQuat,
            rotation: tmpEuler,
            scale: tmpScale,
        };
    }

    /**
     * @internal
     */
    async onDataChange(
        opts: DataChangeOpts<BatchComponentData>
    ): Promise<void> {
        if (opts.isProgress) return;

        if (opts.prev.preset != this.data.preset) {
            //
            this.dispose();

            await this.setPreset(this.data.preset);
        }

        return this._syncInstances();
    }

    /**
     * @internal
     */
    async setPreset(val) {
        //
        if (val == null) return;

        if (val.collider?.enabled == true) {
            val.collider.rigidbodyType = "FIXED";

            this.data.collider = val.collider;
        }

        this._baseComponent = (await this.space.components.create(val, {
            transient: true,
        })) as any;

        this._baseComponent.visible = false;

        this._baseInstancedWrapper =
            this._baseComponent["getInstanceWrapper"]?.();
    }

    /**
     * @internal
     */
    _getCollisionInfo<T>(_opts: T): T {
        return this._colliderOpts as T;
    }

    /**
     * @internal
     */
    async _addItem(
        data: {
            position?: Vector3;
            rotation?: Euler;
            scale?: Vector3;
            boundingBox?: Box3;
            debug?: boolean;
        } = {}
    ) {
        //
        if (this._baseComponent == null) return;

        let item = await this._baseComponent.duplicate({
            transient: true,
            overrideOpts: {
                position: cloneXYZ(data.position),
                rotation: cloneXYZ(data.rotation),
                scale: cloneXYZ(data.scale),
                debug: data.debug,
            },
        });

        this.add(item);
        this._instances.push(item);
        return item;
    }

    /**
     * @internal
     */
    async _removeItem(item: Component3D) {
        //
        item.destroy();

        this._instances = this._instances.filter((i) => i != item);
    }

    private async _syncInstances() {
        //
        if (this._baseComponent == null) return;


        const newLength = this.data.positions.length / 3;

        const currentLength = this._instances.length;

        if (currentLength > newLength) {
            //
            let extra = this._instances.splice(newLength);

            extra.forEach((instance) => {
                //
                instance.destroy();
            });
        }

        //
        for (let i = 0; i < currentLength; i++) {
            //
            const instance = this._instances[i];

            this._dataToTransform(
                this.data,
                i,
                instance.position,
                instance.rotation,
                instance.scale
            );
        }

        for (let i = currentLength; i < newLength; i++) {
            //
            this._dataToTransform(this.data, i, tmpPos, tmpEuler, tmpScale);

            await this._addItem({
                position: tmpPos,
                rotation: tmpEuler,
                scale: tmpScale,
            });
        }

        SET_SHADOW_NEEDS_UPDATE(true);

    }

    private _dataToTransform(
        data: any,
        index: number,
        position: Vector3,
        rotation: Euler,
        scale: Vector3
    ) {
        //
        const i = index * 3;

        position.set(
            data.positions[i],
            data.positions[i + 1],
            data.positions[i + 2]
        );

        rotation.set(
            data.rotations[i],
            data.rotations[i + 1],
            data.rotations[i + 2]
        );

        scale.set(data.scales[i], data.scales[i + 1], data.scales[i + 2]);
    }

    private _collision = null;

    /**
     * @internal
     */
    getCollisionMesh() {
        //
        if (this._baseComponent == null) return null;

        if (this._collision == null) {
            this._collision = this._baseComponent.getCollisionMesh();
        }

        return this._collision;
    }

    /**
     * @internal
     */

    /**
     * @internal
     */
    dispose() {
        //
        this._instances.forEach((instance) => {
            //
            instance.destroy();
        });

        this._wrappers.forEach((wrapper) => {
            //
            wrapper.remove();
        });

        this._instances = [];

        this._wrappers = [];

        this._baseComponent?.destroy();

        this._baseComponent = null;

        SET_SHADOW_NEEDS_UPDATE(true);
    }
}

const tmpPos = new Vector3();
const tmpEuler = new Euler();
const tmpQuat = new Quaternion();
const tmpScale = new Vector3();
const tmpMat = new Matrix4();
