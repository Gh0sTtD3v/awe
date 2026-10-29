import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { ChatZoneComponent } from "./chat-zone-component";

/** @internal */
export class ChatZoneComponentFactory extends DefaultComponentFactory<ChatZoneComponent> {

	Type = ChatZoneComponent;

	static info = {
		type: "chat-zone",
		title: "Chat Zone",
		image: "https://raw.githubusercontent.com/Gh0sTtD3v/awe/refs/heads/main/assets/talk_box.png",
		description: "An area with its own text chat channel",
		draggable: true,
		transform: true,
		studioTab: "worldSettings",
	};

	static {
		const defaultData = {
			kit: "cyber",
			name: "",
			type: "chat-zone",
			position: { x: 0, y: 0, z: 0 },
			rotation: { x: 0, y: 0, z: 0 },
			scale: { x: 8, y: 4, z: 8 },
			label: "",
		};

		this.setDataConfig({
			defaultData,
		});
	}

	static getTitle(data: any) {
		return data.name || data.label || "Chat Zone";
	}
}
