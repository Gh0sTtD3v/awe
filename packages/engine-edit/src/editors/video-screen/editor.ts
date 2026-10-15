import { Component3DEditor } from "../../component-editor/ui-editor";
import { VideoScreenComponent } from "@oncyberio/engine/space/components/video-screen/video-screen-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import { getAudioOptsUI } from "../../component-editor/ui/audio-opts-ui";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

const urlFormat = {
	format: (url: string) => (url ? { path: url } : null),
	parse: (val: any) => val?.path ?? "",
};

/** @internal */
export class VideoScreenComponentEditor extends Component3DEditor<VideoScreenComponent> {

	private _percent = {
		format: (value: number) => Math.round((value ?? 0) * 100),
		parse: (value: number) => value / 100,
	};

	getGUI(): GuiGroupDescriptor {
		return {
			type: "group",
			children: {
				transform: getTransformUI(this),
				playlist: {
					type: "folder",
					label: "Playlist",
					children: {
						label: {
							type: "text",
							label: "Screen name",
							value: [this.data, "label"],
						},
						playlist: {
							type: "array",
							label: "Videos",
							value: [this.data, "playlist"],
							itemGui: (index: number) => ({
								type: "folder",
								label: this.data.playlist?.[index]?.title || `Video ${index + 1}`,
								children: {
									title: {
										type: "text",
										label: "Title",
										value: [this.data.playlist[index], "title"],
									},
									url: {
										type: "text",
										label: "URL",
										value: [this.data.playlist[index], "url"],
									},
									upload: {
										type: "file",
										label: "Upload",
										value: [this.data.playlist[index], "url"],
										accept: ".mp4,.webm,.mov",
										acceptLabel: ".mp4, .webm, .mov",
										prompt: "Upload video",
										action: "upload",
										format: urlFormat,
									},
								},
							}),
						},
					},
				},
				playback: {
					type: "folder",
					label: "Playback",
					children: {
						autoPlay: {
							type: "checkbox",
							label: "Auto play",
							value: [this.data, "autoPlay"],
						},
						loop: {
							type: "select",
							label: "At the end",
							value: [this.data, "loop"],
							items: [
								{ id: "all", label: "Play the next video" },
								{ id: "one", label: "Repeat the video" },
								{ id: "off", label: "Stop" },
							],
						},
						loadDistance: {
							type: "number",
							label: "Load distance",
							value: [this.data, "loadDistance"],
							min: 5,
							max: 200,
							step: 1,
						},
						controlDistance: {
							type: "number",
							label: "Controls distance",
							value: [this.data, "controlDistance"],
							min: 1,
							max: 50,
							step: 0.5,
						},
					},
				},
				audio: {
					type: "folder",
					label: "Audio",
					children: {
						volume: {
							type: "number",
							label: "Volume",
							value: [this.data, "volume"],
							format: this._percent,
							min: 0,
							max: 100,
							step: 1,
						},
						audioType: getAudioOptsUI([this.data, "audioType"]),
						audioRange: {
							visible: () => (this.data.audioType ?? "spatial") === "spatial",
							type: "number",
							label: "Range",
							value: [this.data, "audioRange"],
							min: 1,
							max: 100,
							step: 0.5,
						},
					},
				},
				look: {
					type: "folder",
					label: "Look",
					children: {
						backgroundColor: {
							type: "color",
							label: "Background",
							value: [this.data, "backgroundColor"],
						},
						idleImage: {
							type: "file",
							label: "Idle image",
							value: [this.data, "idleImage"],
							accept: ".png,.jpg,.jpeg,.webp",
							acceptLabel: ".png, .jpg, .webp",
							prompt: "Upload image",
							action: "upload",
							format: urlFormat,
						},
					},
				},
			},
		};
	}
}
