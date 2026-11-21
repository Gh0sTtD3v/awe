import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link MusicZoneComponent}.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface MusicZoneComponentData extends Component3DData {

	type: "music-zone";

	id?: string;

	name?: string;

	/** Centre of the zone. */
	position?: XYZ;

	rotation?: XYZ;

	/** Box: width (x), height (y) and depth (z) in metres. Sphere: x is the diameter. */
	scale?: XYZ;

	/** "box" (a rectangle, e.g. one room) or "sphere" (e.g. ambience over a whole area). */
	shape?: "box" | "sphere";

	/** The music file (an uploaded .mp3, .ogg or .wav URL). */
	url?: string;

	/** Volume inside the zone, 0 to 1. */
	volume?: number;

	/**
	 * Optional fade band around the zone, in metres: the music fades from full
	 * volume at the edge to silent this far outside. 0: no fade band, the
	 * music stops at the edge.
	 */
	fadeDistance?: number;

	/** Play the track again when it ends. */
	loop?: boolean;

	/** Start from the beginning each time the player comes back (otherwise it continues). */
	restartOnEnter?: boolean;
}
