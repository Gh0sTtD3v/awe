import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";


/**
 * @public
 *
 * Data specification for {@link DialogComponent}. See {@link ComponentManager.create} on how to create a component.
 *
 * A dialog component renders a text panel in 3D space. It can be used for NPC speech bubbles,
 * floating labels, in-world notifications, or tutorial prompts. The dialog supports configurable
 * text alignment, background color and opacity, and billboard mode (enabled by default) so the
 * panel always faces the camera.
 */
export interface DialogComponentData extends Component3DData {

    /**
     * @internal
     */
    kit?: "cyber";

    /**
     * Component type. Must be `"text"` for dialog components.
     */
    type: "text";

    /**
     * Optional unique identifier for the component. If not provided, an id will be
     * auto-generated.
     */
    id?: string;

    /**
     * Optional display name for the component, used for identification purposes.
     * Defaults to `""`.
     */
    name?: string;

    /**
     * Position of the component in the space. Defaults to {x: 0, y: 0, z: 0}
     */
    position?: XYZ;

    /**
     * Rotation of the component in the space. Defaults to {x: 0, y: 0, z: 0}
     * Do not set any rotation on the component if the dialog is billboarded
     */
    rotation?: XYZ;

    /**
     * Scale of the component in the space. Defaults to {x: 1, y: 1, z: 1}
     */
    scale?: XYZ;

    /**
     * The text content displayed in the dialog panel. This is a required property.
     */
    text: string;

    /**
     * Whether the dialog should use billboard mode. When enabled, the dialog
     * automatically rotates to always face the camera, and any `rotation` values
     * are ignored. Defaults to `true`.
     */
    billboard: boolean;

    /**
     * The background color of the dialog as a hex integer (e.g., `0x000000` for black,
     * `0xff0000` for red). Defaults to `0x000000`.
     */
    backgroundColor: number;


    /**
     * The background opacity of the dialog panel. Value ranges from `0` (fully transparent)
     * to `1` (fully opaque). Defaults to `1`.
     */
    backgroundOpacity: number;

    /**
     * The maximum width of the dialog panel in scene units. Text will word-wrap
     * within this width.
     */
    width: number;

    /**
     * The horizontal text alignment within the dialog panel. Defaults to `"center"`.
     */
    align: 'left' | 'center' | 'right'

    /**
     * @internal
     */
    parent: any;
}
