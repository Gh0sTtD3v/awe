import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { MusicZoneComponent } from "./music-zone-component";
import { MUSIC_ZONE_ICON } from "./music-zone-icon";

/** @internal */
export class MusicZoneComponentFactory extends DefaultComponentFactory<MusicZoneComponent> {

	Type = MusicZoneComponent;

	static info = {
		type: "music-zone",
		title: "Music Zone",
		image: MUSIC_ZONE_ICON,
		description: "Music in an area (box or sphere), with an optional fade around it",
		draggable: true,
		transform: true,
		studioTab: "worldSettings",
	};

	static {
		const defaultData = {
			kit: "cyber",
			name: "",
			type: "music-zone",
			position: { x: 0, y: 2, z: 0 },
			rotation: { x: 0, y: 0, z: 0 },
			scale: { x: 8, y: 4, z: 8 },
			shape: "box",
			url: "",
			volume: 0.8,
			fadeDistance: 6,
			loop: true,
			restartOnEnter: false,
		};

		this.setDataConfig({
			defaultData,
		});
	}

	static getTitle(data: any) {
		return data.name || "Music Zone";
	}
}
