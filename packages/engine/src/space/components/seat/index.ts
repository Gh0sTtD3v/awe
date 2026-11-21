import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { SeatComponent } from "./seat-component";
import { SEAT_ICON } from "./seat-icon";

/** @internal */
export class SeatComponentFactory extends DefaultComponentFactory<SeatComponent> {

	Type = SeatComponent;

	static info = {
		type: "seat",
		title: "Seat",
		image: SEAT_ICON,
		description: "A place to sit: walk up to it and press E",
		draggable: true,
		transform: true,
		studioTab: "worldSettings",
	};

	static {
		const defaultData = {
			kit: "cyber",
			name: "",
			type: "seat",
			position: { x: 0, y: 0, z: 0 },
			rotation: { x: 0, y: 0, z: 0 },
			scale: { x: 0.6, y: 1, z: 0.6 },
			range: 1.5,
			heightOffset: 0,
			prompt: "Sit",
		};

		this.setDataConfig({
			defaultData,
		});
	}

	static getTitle(data: any) {
		return data.name || "Seat";
	}
}
