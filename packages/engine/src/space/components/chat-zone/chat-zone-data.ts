import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link ChatZoneComponent}.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface ChatZoneComponentData extends Component3DData {

	type: "chat-zone";

	id?: string;

	name?: string;

	position?: XYZ;

	rotation?: XYZ;

	/** The zone's box: a unit cube scaled by this. */
	scale?: XYZ;

	/** Room name shown on the chat tab, e.g. "Lounge". */
	label?: string;
}
