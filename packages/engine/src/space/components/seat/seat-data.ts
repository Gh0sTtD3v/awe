import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link SeatComponent}.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface SeatComponentData extends Component3DData {

	type: "seat";

	id?: string;

	name?: string;

	/** Centre of the seat surface: where the avatar sits. */
	position?: XYZ;

	/** Only the Y rotation is used: the direction the seated avatar faces (the arrow). */
	rotation?: XYZ;

	/** Size of the square in the studio. Does not change the sitting pose. */
	scale?: XYZ;

	/** How close (in metres) a player must be to get the "sit" prompt. */
	range?: number;

	/** Raise (+) or lower (-) the seated avatar, in metres, to fit the chair. */
	heightOffset?: number;

	/** Text after "E" in the prompt, e.g. "Sit" or "Sit on the bench". */
	prompt?: string;
}
