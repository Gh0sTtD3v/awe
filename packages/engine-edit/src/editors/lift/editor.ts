import { Component3DEditor } from "../../component-editor/ui-editor";
import { LiftComponent } from "@oncyberio/engine/space/components/lift/lift-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

/** @internal */
export class LiftComponentEditor extends Component3DEditor<LiftComponent> {

	getGUI(): GuiGroupDescriptor {
		return {
			type: "group",
			children: {
				transform: getTransformUI(this),
				lift: {
					type: "folder",
					label: "Lift",
					children: {
						group: {
							type: "text",
							label: "Lift name",
							value: [this.data, "group"],
						},
						floor: {
							type: "number",
							label: "Floor",
							value: [this.data, "floor"],
							step: 1,
						},
						floorLabel: {
							type: "text",
							label: "Floor name",
							value: [this.data, "floorLabel"],
						},
					},
				},
			},
		};
	}
}
