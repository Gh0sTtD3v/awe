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
	 * Vertical speed, in metres per second, players are carried at inside the
	 * zone: positive lifts them up (they stop at the top), negative pushes them
	 * down, 0 makes them float.
	 */
	strength?: number;
}
