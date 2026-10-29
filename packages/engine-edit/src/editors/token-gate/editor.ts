import { Component3DEditor } from "../../component-editor/ui-editor";
import { TokenGateComponent } from "@oncyberio/engine/space/components/token-gate/token-gate-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { TOKEN_GATE_CHAINS } from "@oncyberio/engine/space/components/token-gate/token-gate-data";

const COSMOS_HOLDS = [
	{ id: "cft20", label: "CFT-20 token" },
	{ id: "inscription", label: "Inscription (NFT)" },
];

const EVM_HOLDS = [
	{ id: "erc20", label: "Token (ERC-20)" },
	{ id: "nft", label: "NFT (ERC-721 / 1155)" },
];

/** @internal */
export class TokenGateComponentEditor extends Component3DEditor<TokenGateComponent> {

	private isEvm(): boolean {
		return (this.data.chain ?? "cosmos") !== "cosmos";
	}

	private holdsNft(): boolean {
		return this.data.requirementType === "inscription" || this.data.requirementType === "nft";
	}

	getGUI(): GuiGroupDescriptor {
		return {
			type: "group",
			children: {
				transform: getTransformUI(this),
				requirement: {
					type: "folder",
					label: "Requirement",
					children: {
						chain: {
							type: "select",
							label: "Chain",
							value: [this.data, "chain"],
							items: TOKEN_GATE_CHAINS.map((c) => ({ id: c.id, label: c.label })),
							onChange: () => {
								// Keep the kind (token / NFT) when switching between Cosmos and EVM.
								const nft = this.holdsNft();
								this.dispatchDataChange({
									requirementType: this.isEvm()
										? (nft ? "nft" : "erc20")
										: (nft ? "inscription" : "cft20"),
								});
								this.updateUI();
							},
						},
						requirementType: {
							type: "select",
							label: "Holds",
							value: [this.data, "requirementType"],
							items: () => (this.isEvm() ? EVM_HOLDS : COSMOS_HOLDS),
						},
						ticker: {
							type: "text",
							label: "Ticker",
							value: [this.data, "ticker"],
							visible: () => !this.isEvm() && !this.holdsNft(),
						},
						collection: {
							type: "text",
							label: "Collection",
							value: [this.data, "collection"],
							visible: () => !this.isEvm() && this.holdsNft(),
						},
						contract: {
							type: "text",
							label: "Contract address",
							value: [this.data, "contract"],
							visible: () => this.isEvm(),
						},
						symbol: {
							type: "text",
							label: "Symbol (shown to players)",
							value: [this.data, "ticker"],
							visible: () => this.isEvm() && !this.holdsNft(),
						},
						tokenId: {
							type: "text",
							label: "Token id (ERC-1155 only)",
							value: [this.data, "tokenId"],
							visible: () => this.isEvm() && this.holdsNft(),
						},
						minAmount: {
							type: "text",
							label: "Minimum amount",
							value: [this.data, "minAmount"],
							visible: () => !this.holdsNft(),
						},
					},
				},
				access: {
					type: "folder",
					label: "Access",
					children: {
						label: {
							type: "text",
							label: "Area name",
							value: [this.data, "label"],
						},
						doorTag: {
							type: "text",
							label: "Door tag",
							value: [this.data, "doorTag"],
						},
						exitOffset: {
							type: "xyz",
							label: "Exit offset",
							value: [this.data, "exitOffset"],
							step: 0.1,
						},
					},
				},
			},
		};
	}
}
