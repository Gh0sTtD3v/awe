import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";


/**
 * @public
 *
 * Configuration data for the {@link GodrayComponent}. Defines the appearance and transform
 * of a volumetric light ray (godray) effect in the scene. Godrays simulate beams of light
 * shining through the environment, creating a dramatic atmospheric lighting effect.
 *
 * See {@link ComponentManager.create} for how to create a component from this data.
 */
export interface GodrayComponentData extends Component3DData {

    /**
     * @internal
     */
    kit?: "cyber";

    /**
     * Component type discriminator. Must be `"godray"`.
     */
    type: "godray";

    /**
     * Optional unique identifier for the component. If not provided, an auto-generated id will be assigned.
     */
    id?: string;

    /**
     * Display name for the component. Defaults to `""`.
     */
    name?: string;

    /**
     * Position of the component in world space. Defaults to `{x: 0, y: 0, z: 0}`.
     */
    position?: XYZ;

    /**
     * Rotation of the component in world space, in degrees. Defaults to `{x: 0, y: 0, z: 0}`.
     */
    rotation?: XYZ;

    /**
     * Scale of the godray effect. The y-axis controls the height/length of the light beam.
     * Defaults to `{x: 1, y: 10, z: 1}`.
     */
    scale?: XYZ;

    /**
     * Opacity of the godray effect, controlling how transparent the light beams appear.
     * Accepts values from `0` (fully transparent) to `1` (fully opaque). Defaults to `1`.
     */
    opacity?: number,

    /**
     * Color of the godray light beams, specified as a hexadecimal number
     * (e.g., `0xff0000` for red, `0xffffff` for white). Defaults to `0xffffff`.
     */
    color?: number
}
