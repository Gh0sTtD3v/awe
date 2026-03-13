import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";


/**
 * @public
 *
 * Configuration data for {@link CloudComponent}. Defines the appearance and transform
 * of a decorative cloud in the 3D scene, including its shape, opacity, position,
 * rotation, and scale.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface CloudComponentData extends Component3DData {

    /**
     * @internal
     */
    kit?: "cyber";

    /**
     * Component type discriminator. Must be `"cloud"`.
     */
    type: "cloud";

    /**
     * Optional unique identifier for the component. If not provided, an auto-generated
     * id will be assigned. Can be used to retrieve the component via `space.components.byId()`.
     */
    id?: string;

    /**
     * Display name for the component. Defaults to `""`.
     */
    name?: string;

    /**
     * Position of the component in the space. Defaults to `{x: 0, y: 0, z: 0}`.
     */
    position?: XYZ;

    /**
     * Rotation of the component in the space, in radians. Defaults to `{x: 0, y: 0, z: 0}`.
     */
    rotation?: XYZ;

    /**
     * Scale of the component in the space. Defaults to `{x: 1, y: 1, z: 1}`.
     */
    scale?: XYZ;

    /**
     * Opacity of the cloud, ranging from `0` (fully transparent) to `1` (fully opaque).
     * Defaults to `1`.
     */
    opacity?: number;

    /**
     * Selects the cloud shape variant. Use a number from `0` to `3`, where each value
     * corresponds to a distinct cloud silhouette style. Defaults to `0`.
     */
    atlas?: number;
}
