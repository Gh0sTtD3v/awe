import { Component3DEditor } from "../../component-editor/ui-editor";
import { ChatZoneComponent } from "@oncyberio/engine/space/components/chat-zone/chat-zone-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

/** @internal */
export class ChatZoneComponentEditor extends Component3DEditor<ChatZoneComponent> {

	getGUI(): GuiGroupDescriptor {
		return {
			type: "group",
			children: {
				transform: getTransformUI(this),
				chat: {
					type: "folder",
					label: "Chat",
					children: {
						label: {
							type: "text",
							label: "Room name",
							value: [this.data, "label"],
						},
					},
				},
			},
		};
	}
}
