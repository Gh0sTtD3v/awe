import { Component3DEditor } from "../../component-editor/ui-editor";
import { PortalComponent } from "@oncyberio/engine/space/components/portal/portal-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import Camera from "@oncyberio/engine/camera";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

/** @internal */
export class PortalComponentEditor extends Component3DEditor<PortalComponent> {

	getGUI(): GuiGroupDescriptor {
		return {
			type: "group",
			children: {
				transform: getTransformUI(this),
				portal: {
					type: "folder",
					label: "Portal",
					children: {
						destination: {
							type: "xyz",
							label: "Destination",
							value: [this.data, "destination"],
							step: 0.1,
							min: -640000000,
							max: 640000000,
						},
						goTo: {
							type: "button",
							label: "Go to destination",
							onAction: () => {
								const dest = this.data.destination;
								if (!dest) return;
								Camera.current.position.set(
									dest.x ?? 0,
									(dest.y ?? 0) + 5,
									(dest.z ?? 0) + 5,
								);
								Camera.current.lookAt(
									dest.x ?? 0,
									dest.y ?? 0,
									dest.z ?? 0,
								);
							},
						},
						setFromCamera: {
							type: "button",
							label: "Set from camera",
							onAction: () => {
								const pos = Camera.current.position;
								this.dispatchDataChange({
									destination: {
										x: Math.round(pos.x * 100) / 100,
										y: Math.round(pos.y * 100) / 100,
										z: Math.round(pos.z * 100) / 100,
									},
								});
								this.updateUI();
							},
						},
						radius: {
							type: "number",
							label: "Radius",
							value: [this.data, "radius"],
							min: 0.1,
							max: 50,
							step: 0.1,
						},
						color: {
							type: "color",
							label: "Color",
							value: [this.data, "color"],
						},
						opacity: {
							type: "number",
							label: "Opacity",
							value: [this.data, "opacity"],
							min: 0,
							max: 1,
							step: 0.01,
						},
						display: {
							type: "checkbox",
							label: "Display in Live Mode",
							value: [this.data, "display"],
						},
					},
				},
			},
		};
	}
}
