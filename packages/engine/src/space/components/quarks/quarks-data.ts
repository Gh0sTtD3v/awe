import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link QuarksComponent}. Defines a particle effect
 * powered by the [three.quarks](https://github.com/Alchemist0823/three.quarks)
 * library. Effects are authored in the [quarks.art](https://quarks.art) visual
 * editor, exported as JSON, and loaded by URL.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface QuarksComponentData extends Component3DData {
    /**
     * @internal
     */
    kit?: "cyber";

    /**
     * Component type discriminator. Must be `"quarks"`.
     */
    type: "quarks";

    /**
     * If not provided, an auto-generated id will be assigned.
     */
    id?: string;

    /**
     * Name for the component. Defaults to `""`
     */
    name?: string;

    /**
     * Position of the component in the space. Defaults to `{x: 0, y: 0, z: 0}`
     */
    position?: XYZ;

    /**
     * Rotation of the component in the space. Defaults to `{x: 0, y: 0, z: 0}`
     */
    rotation?: XYZ;

    /**
     * Scale of the component in the space. Defaults to `{x: 1, y: 1, z: 1}`
     */
    scale?: XYZ;

    /**
     * URL to a quarks JSON effect file exported from the
     * [quarks.art](https://quarks.art) visual editor.
     */
    url: string;

    /**
     * Whether the effect starts playing automatically on load.
     * Defaults to `true`.
     */
    autoPlay?: boolean;

    /**
     * Whether the effect loops. Defaults to `true`.
     */
    looping?: boolean;

    /**
     * Playback speed multiplier. Range: 0.1 - 10. Defaults to `1`.
     */
    speed?: number;
}
