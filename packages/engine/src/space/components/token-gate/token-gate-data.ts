import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * What a player must hold to enter a {@link TokenGateComponent}.
 *
 * On Cosmos (`chain` `"cosmos"`):
 * - `cft20`: at least `minAmount` (display units) of the CFT-20 `ticker`.
 * - `inscription`: at least one inscription from `collection`.
 *
 * On an EVM chain:
 * - `erc20`: at least `minAmount` (display units) of the token at `contract`.
 * - `nft`: at least one ERC-721 from `contract`, or of ERC-1155 `tokenId`.
 */
export type TokenGateRequirementType = "cft20" | "inscription" | "erc20" | "nft";

/**
 * @public
 *
 * Chains a token gate can check. `"cosmos"` is Cosmos Hub (CFT-20 and
 * inscriptions); the rest are EVM chains.
 */
export const TOKEN_GATE_CHAINS = [
	{ id: "cosmos", label: "Cosmos (CFT-20)" },
	{ id: "ethereum", label: "Ethereum" },
	{ id: "base", label: "Base" },
	{ id: "polygon", label: "Polygon" },
	{ id: "arbitrum", label: "Arbitrum" },
	{ id: "optimism", label: "Optimism" },
	{ id: "bsc", label: "BNB Chain" },
	{ id: "avalanche", label: "Avalanche" },
] as const;

/** @public */
export type TokenGateChain = (typeof TOKEN_GATE_CHAINS)[number]["id"];

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

	/** Defaults to `"cosmos"`. */
	chain?: TokenGateChain;

	/** Defaults to `"cft20"` on Cosmos and `"erc20"` on EVM chains. */
	requirementType?: TokenGateRequirementType;

	/**
	 * CFT-20 ticker, e.g. `"ROIDS"`, when `requirementType` is `"cft20"`. For
	 * `"erc20"`, the symbol shown to players (optional).
	 */
	ticker?: string;

	/** Token or NFT contract address (`0x…`). Used on EVM chains. */
	contract?: string;

	/** ERC-1155 token id. Leave empty for ERC-721 collections. */
	tokenId?: string;

	/** Inscription collection id or symbol. Used when `requirementType` is `"inscription"`. */
	collection?: string;

	/** Minimum CFT-20 / ERC-20 balance in display units. Defaults to `"1"`. */
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
