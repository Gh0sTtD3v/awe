import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link GravityZoneComponent}.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface GravityZoneComponentData extends Component3DData {

	type: "gravity-zone";

	id?: string;

	name?: string;

	/** Centre of the floor of the zone. The zone rises `height` metres from here. */
	position?: XYZ;

	rotation?: XYZ;

	/** Width (x) and depth (z) of the floor. The y scale is ignored: use `height`. */
	scale?: XYZ;

	/** How tall the zone is, in metres, from its floor up. */
	height?: number;

	/**
	 * Metres per second. Positive: players are lifted at this speed and stop at
	 * the top. Negative: gravity is slowed, players fall no faster than this
	 * (like a parachute). 0: players float.
	 */
	strength?: number;
}
