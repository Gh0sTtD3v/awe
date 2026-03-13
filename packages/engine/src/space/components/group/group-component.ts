// @ts-check

import { Component3D } from "../../abstract/component-3d";
import { GroupComponentData } from "./group-data";
import { Box3, BoxGeometry, Mesh, MeshBasicMaterial } from "three";
import { IS_EDIT_MODE, SET_SHADOW_NEEDS_UPDATE } from "../../../internal/constants";

/**
 * @public
 *
 * A container component that groups multiple child components under a single
 * parent node in the scene graph. Transforms (position, rotation, scale)
 * applied to the group propagate to all child components, allowing them to be
 * moved, rotated, and scaled together as a unit.
 *
 * The group's bounding box is computed as the union of all child component
 * bounding boxes. When the group has no children, a placeholder mesh is shown
 * in the editor to indicate the group's position.
 *
 * See {@link GroupComponentData} for the data schema used to configure a group.
 *
 * @example
 * ```ts
 * // Create a group to hold related objects
 * const group = await space.components.create({
 *   type: "group",
 *   position: { x: 0, y: 2, z: 0 },
 *   scale: { x: 1, y: 1, z: 1 },
 * });
 *
 * // Add child components to the group
 * const child1 = await space.components.create({
 *   type: "model",
 *   url: "https://example.com/tree.glb",
 *   position: { x: -1, y: 0, z: 0 },
 * }, { parent: group });
 *
 * const child2 = await space.components.create({
 *   type: "model",
 *   url: "https://example.com/rock.glb",
 *   position: { x: 1, y: 0, z: 0 },
 * }, { parent: group });
 *
 * // Moving the group moves all children together
 * group.setData({ position: { x: 5, y: 2, z: 0 } });
 * ```
 */
export class GroupComponent extends Component3D<GroupComponentData> {
    //

    private _mesh: Mesh = null;

    /** @internal */
    protected async init() {
        //
        if (IS_EDIT_MODE) {
            //
            this._mesh = new Mesh(
                new BoxGeometry(1, 1, 1),
                new MeshBasicMaterial({ color: 0xff0000 }),
            );

            this.add(this._mesh);

            this._mesh.visible = false;
        }

        this.on(this.EVENTS.CHILD_ADDED, this._update3D);
        this.on(this.EVENTS.CHILD_REMOVED, this._update3D);

        this._update3D();
    }

    private _update3D = () => {
        if (IS_EDIT_MODE) {
            this._mesh.visible = this.childComponents.length == 0;
        }
    };

    /**
     * @internal
     */
    onDataChange(opts) {
        this._update3D();
        if (IS_EDIT_MODE && !opts?.isProgress && this.childComponents.length > 0) {
            SET_SHADOW_NEEDS_UPDATE(true);
        }
    }

    /** @internal */
    protected dispose() {
        this.off(this.EVENTS.CHILD_ADDED, this._update3D);
        this.off(this.EVENTS.CHILD_REMOVED, this._update3D);
    }

    private _childBBox = new Box3();

    /** @internal */
    getCollisionMesh() {
        return this._mesh;
    }

    protected _getBBoxImp(target: Box3) {
        //
        const childBox = this._childBBox;

        this.childComponents.forEach((child) => {
            child.updateMatrixWorld(false);
            child.getBBox(childBox);
            target.union(childBox);
        });

        return target;
    }
}
