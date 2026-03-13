import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";


/**
 * @public
 *
 * Data specification for {@link BirdComponent}. Configures an animated bird/butterfly flock
 * rendered using GPU-instanced meshes. The birds follow circular flight paths with
 * wing-flapping animation.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface BirdComponentData extends Component3DData {

    /**
     * @internal
     */
    kit?: "cyber";

    /**
     * The component type discriminator. Must always be `"bird"`.
     */
    type: "bird";

    /**
     * Optional identifier for the component. If not provided, an auto-generated id will be assigned.
     */
    id?: string;

    /**
     * Name for the component. Defaults to `""`.
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
     * Color of the bird as a hexadecimal number (e.g., `0xff0000` for red). Defaults to `0xffffff` (white).
     */
    color?: number;

    /**
     * Opacity of the bird, ranging from `0` (fully transparent) to `1` (fully opaque). Defaults to `1`.
     */
    opacity?: number;
}
