import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { LiftComponent } from "./lift-component";

/** @internal */
export class LiftComponentFactory extends DefaultComponentFactory<LiftComponent> {

	Type = LiftComponent;

	static info = {
		type: "lift",
		title: "Lift",
		image: "https://raw.githubusercontent.com/Gh0sTtD3v/awe/refs/heads/main/assets/lift.png",
		description: "A lift stop: step in to travel between floors",
		draggable: true,
		transform: true,
		studioTab: "worldSettings",
	};

	static {
		const defaultData = {
			kit: "cyber",
			name: "",
			type: "lift",
			position: { x: 0, y: 0, z: 0 },
			rotation: { x: 0, y: 0, z: 0 },
			scale: { x: 3, y: 3, z: 3 },
			group: "Lift",
			floor: 0,
			floorLabel: "",
		};

		this.setDataConfig({
			defaultData,
		});
	}

	static getTitle(data: any) {
		return data.name || `${data.group || "Lift"} · Floor ${data.floor ?? 0}`;
	}
}
