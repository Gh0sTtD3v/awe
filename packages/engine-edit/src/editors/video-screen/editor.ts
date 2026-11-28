import { Component3DEditor } from "../../component-editor/ui-editor";
import { VideoScreenComponent } from "@oncyberio/engine/space/components/video-screen/video-screen-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import { getAudioOptsUI } from "../../component-editor/ui/audio-opts-ui";
import { arrayItemLens } from "../../component-editor/ui/array-item-lens";
import type { GuiDescriptor, GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

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

	/**
	 * A list of { title, url } entries. Item fields go through
	 * `arrayItemLens`, which saves the whole list on every edit.
	 */
	private _itemList(key: "playlist" | "ads", noun: string): GuiDescriptor {
		return {
			type: "array",
			label: key === "ads" ? "Ads" : "Videos",
			value: [this.data, key],
			itemType: "group",
			createNewData: () => ({ title: "", url: "" }),
			reset: () => [],
			itemGui: (index: number) => ({
				type: "group",
				children: {
					title: {
						type: "text",
						label: "Title",
						value: arrayItemLens(this, key, index, "title"),
					},
					url: {
						type: "text",
						label: "URL",
						value: arrayItemLens(this, key, index, "url"),
					},
					upload: {
						type: "file",
						label: "Upload",
						value: arrayItemLens(this, key, index, "url"),
						accept: ".mp4,.webm,.mov",
						acceptLabel: ".mp4, .webm, .mov",
						prompt: `Upload ${noun}`,
						action: "upload",
						format: urlFormat,
					},
				},
			}),
		};
	}

	/** Token gates in the scene, for "who can control". */
	private _gateItems = () => {
		const gates = ((this.component as any)?.space?.components?.byType?.("token-gate") ?? []) as any[];
		return [
			{ id: "", label: "Only roles with Control Screens" },
			{ id: "everyone", label: "Everyone" },
			...gates.map((g) => ({ id: g.data.id, label: `Holders of ${g.data.label || g.data.name || g.data.id}` })),
		];
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
						playlist: this._itemList("playlist", "video"),
					},
				},
				ads: {
					type: "folder",
					label: "Ads",
					children: {
						ads: this._itemList("ads", "ad"),
					},
				},
				control: {
					type: "folder",
					label: "Controls",
					children: {
						controlGate: {
							type: "select",
							label: "Who can control",
							value: [this.data, "controlGate"],
							items: this._gateItems,
						},
						controlDistance: {
							type: "number",
							label: "Interaction distance",
							value: [this.data, "controlDistance"],
							min: 1,
							max: 50,
							step: 0.5,
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
