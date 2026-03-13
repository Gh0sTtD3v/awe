import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";


/**
 * @public
 *
 * Configuration data for {@link WaveComponent}. Defines the appearance and transform
 * of an animated wave effect that renders concentric circular lines radiating inward
 * or outward from a central point. The wave can be customized with color, radius,
 * line width, number of lines, geometry detail, and animation direction.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface WaveComponentData extends Component3DData {

    /**
     * @internal
     */
    kit?: "cyber";

    /**
     * Component type discriminator. Must be `"wave"`.
     */
    type: "wave";

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
     * Rotation of the component in the space. Defaults to `{x: 0, y: 0, z: 0}`.
     */
    rotation?: XYZ;

    /**
     * Color of the wave lines as a hex number (e.g. `0x00ffff`). Defaults to `0xffffff`.
     */
    color?: number,

    /**
     * Vertical amplitude of the wave animation. Higher values make the wave taller.
     * Must be >= `0`. Defaults to `0.5`.
     */
    height?: number,

    /**
     * Radius of the wave effect, controlling how far the concentric circles extend
     * from the center. Must be >= `0`. Defaults to `5`.
     */
    radius?: number,

    /**
     * Width of individual wave lines, ranging from `0` to `1`. Defaults to `0.14`.
     */
    linewidth?: number,

    /**
     * Number of subdivisions in the wave mesh geometry. Higher values produce smoother
     * circles but increase geometry complexity. Must be >= `0`. Changing this value
     * causes the wave mesh to be regenerated. Defaults to `100`.
     */
    divisions?: number,

    /**
     * Number of concentric circular lines in the wave. Must be >= `0`. Changing this
     * value causes the wave mesh to be regenerated. Defaults to `4`.
     */
    lines? : number,

    /**
     * Direction of the wave animation. Use `1` for outward-radiating circles or
     * `-1` for inward-radiating circles. Defaults to `-1`.
     */
    direction: -1,
}
