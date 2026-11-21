import { Component3DEditor } from "../../component-editor/ui-editor";
import { SeatComponent } from "@oncyberio/engine/space/components/seat/seat-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

/** @internal */
export class SeatComponentEditor extends Component3DEditor<SeatComponent> {

	getGUI(): GuiGroupDescriptor {
		return {
			type: "group",
			children: {
				transform: getTransformUI(this),
				seat: {
					type: "folder",
					label: "Seat",
					children: {
						prompt: {
							type: "text",
							label: "Prompt",
							value: [this.data, "prompt"],
						},
						range: {
							type: "number",
							label: "Range (m)",
							value: [this.data, "range"],
							min: 0.5,
							max: 10,
							step: 0.1,
						},
						heightOffset: {
							type: "number",
							label: "Height offset (m)",
							value: [this.data, "heightOffset"],
							min: -2,
							max: 2,
							step: 0.01,
						},
					},
				},
			},
		};
	}
}
