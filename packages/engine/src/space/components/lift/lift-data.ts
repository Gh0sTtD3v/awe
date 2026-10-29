import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link LiftComponent}.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface LiftComponentData extends Component3DData {

	type: "lift";

	id?: string;

	name?: string;

	position?: XYZ;

	rotation?: XYZ;

	/** The box: a unit cube scaled by this. Players arrive at its bottom centre. */
	scale?: XYZ;

	/** Boxes with the same lift name are the floors of one lift, e.g. "Tower A". */
	group?: string;

	/** This box's floor number. Floors are listed highest first. */
	floor?: number;

	/** Optional floor name shown in the lift panel, e.g. "Lobby". */
	floorLabel?: string;
}
