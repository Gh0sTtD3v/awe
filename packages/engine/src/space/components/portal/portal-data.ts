import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link PortalComponent}.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface PortalComponentData extends Component3DData {

	type: "portal";

	id?: string;

	name?: string;

	position?: XYZ;

	rotation?: XYZ;

	scale?: XYZ;

	/** Target world position to teleport to. */
	destination?: XYZ;

	/** Portal disc radius. Defaults to `1`. */
	radius?: number;

	/** Portal disc color. Defaults to `"#00ffff"`. */
	color?: string;

	/** Portal opacity. Defaults to `0.8`. */
	opacity?: number;

	/** Whether the portal is visible during play. Defaults to `true`. */
	display?: boolean;
}
