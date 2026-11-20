import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { GravityZoneComponent } from "./gravity-zone-component";
import { GRAVITY_ZONE_ICON } from "./gravity-zone-icon";

/** @internal */
export class GravityZoneComponentFactory extends DefaultComponentFactory<GravityZoneComponent> {

	Type = GravityZoneComponent;

	static info = {
		type: "gravity-zone",
		title: "Reverse Gravity",
		image: GRAVITY_ZONE_ICON,
		description: "Lifts players up, or slows their fall: elevators and safe drops",
		draggable: true,
		transform: true,
		studioTab: "worldSettings",
	};

	static {
		const defaultData = {
			kit: "cyber",
			name: "",
			type: "gravity-zone",
			position: { x: 0, y: 0, z: 0 },
			rotation: { x: 0, y: 0, z: 0 },
			scale: { x: 3, y: 1, z: 3 },
			height: 6,
			strength: 4,
		};

		this.setDataConfig({
			defaultData,
		});
	}

	static getTitle(data: any) {
		return data.name || "Reverse Gravity";
	}
}
