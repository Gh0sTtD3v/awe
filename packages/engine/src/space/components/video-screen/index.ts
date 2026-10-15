import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { VideoScreenComponent } from "./video-screen-component";

/** @internal */
export class VideoScreenComponentFactory extends DefaultComponentFactory<VideoScreenComponent> {

	Type = VideoScreenComponent;

	static info = {
		type: "video-screen",
		title: "Video Screen",
		image: "https://raw.githubusercontent.com/Gh0sTtD3v/awe/refs/heads/main/assets/video.png",
		description: "A screen with a playlist that every player watches in sync",
		draggable: true,
		transform: true,
		is2D: true,
		studioTab: "worldSettings",
	};

	static {
		const defaultData = {
			kit: "cyber",
			name: "",
			type: "video-screen",
			position: { x: 0, y: 0, z: 0 },
			rotation: { x: 0, y: 0, z: 0 },
			scale: { x: 16 / 9 * 3, y: 3, z: 1 },
			label: "",
			playlist: [],
			autoPlay: false,
			loop: "all",
			volume: 0.75,
			audioType: "spatial",
			audioRange: 15,
			loadDistance: 40,
			controlDistance: 8,
			backgroundColor: "#000000",
			idleImage: "",
		};

		this.setDataConfig({
			defaultData,
		});
	}

	static getTitle(data: any) {
		return data.name || data.label || "Video Screen";
	}
}
