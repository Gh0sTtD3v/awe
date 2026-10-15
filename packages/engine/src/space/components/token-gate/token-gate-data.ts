import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * What a player must hold to enter a {@link TokenGateComponent}.
 *
 * - `cft20`: at least `minAmount` (display units) of the CFT-20 `ticker`.
 * - `inscription`: at least one inscription from `collection`.
 */
export type TokenGateRequirementType = "cft20" | "inscription";

/**
 * @public
 *
 * Configuration data for {@link TokenGateComponent}.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface TokenGateComponentData extends Component3DData {

	type: "token-gate";

	id?: string;

	name?: string;

	position?: XYZ;

	rotation?: XYZ;

	/** The gated box: a unit cube scaled by this. */
	scale?: XYZ;

	/** Defaults to `"cft20"`. */
	requirementType?: TokenGateRequirementType;

	/** CFT-20 ticker, e.g. `"ROIDS"`. Used when `requirementType` is `"cft20"`. */
	ticker?: string;

	/** Inscription collection id or symbol. Used when `requirementType` is `"inscription"`. */
	collection?: string;

	/** Minimum CFT-20 balance in display units. Defaults to `"1"`. */
	minAmount?: string;

	/**
	 * World-space offset from the gate's centre where players without access
	 * are sent. Must land outside the box.
	 */
	exitOffset?: XYZ;

	/**
	 * Components whose `script.tag` equals this act as the gate's doors: solid
	 * for players without access, passable for holders.
	 */
	doorTag?: string;

	/** Human-readable name shown in the "access required" notice. */
	label?: string;
}
