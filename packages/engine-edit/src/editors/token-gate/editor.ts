import { Component3DEditor } from "../../component-editor/ui-editor";
import { TokenGateComponent } from "@oncyberio/engine/space/components/token-gate/token-gate-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

/** @internal */
export class TokenGateComponentEditor extends Component3DEditor<TokenGateComponent> {

	getGUI(): GuiGroupDescriptor {
		return {
			type: "group",
			children: {
				transform: getTransformUI(this),
				requirement: {
					type: "folder",
					label: "Requirement",
					children: {
						requirementType: {
							type: "select",
							label: "Holds",
							value: [this.data, "requirementType"],
							items: [
								{ id: "cft20", label: "CFT-20 token" },
								{ id: "inscription", label: "Inscription (NFT)" },
							],
						},
						ticker: {
							type: "text",
							label: "Ticker",
							value: [this.data, "ticker"],
							visible: () => this.data.requirementType !== "inscription",
						},
						minAmount: {
							type: "text",
							label: "Minimum amount",
							value: [this.data, "minAmount"],
							visible: () => this.data.requirementType !== "inscription",
						},
						collection: {
							type: "text",
							label: "Collection",
							value: [this.data, "collection"],
							visible: () => this.data.requirementType === "inscription",
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
