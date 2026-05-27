import { getTransformUI } from "../../component-editor/ui/transform-ui";
import { Component3DEditor } from "../../component-editor/ui-editor";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";
import { VideoComponent } from "@oncyberio/engine/space/components/video/video-component";
import { getAudioOptsUI } from "../../component-editor/ui/audio-opts-ui";
import { LEGACY_UpgradeScale } from "../legacy";

/** @internal */
export class VideoEditor extends Component3DEditor<VideoComponent> {
	//

	private _prevUrl: string = null;
	private _extracting = false;

	init() {
		//
		LEGACY_UpgradeScale(this);

		this._prevUrl = this.data.url;

		this._dataWrapper.onChange(() => {
			if (this.data.url && this.data.url !== this._prevUrl) {
				this._prevUrl = this.data.url;
				this._maybeExtractThumbnail();
			}
		});

		// Extract on first init if no preview exists
		if (this.data.url && !this.data.preview) {
			this._maybeExtractThumbnail();
		}
	}

	private async _maybeExtractThumbnail() {
		if (this._extracting) return;
		this._extracting = true;

		try {
			const url = await this._extractThumbnail(this.data.url);
			this.dispatchDataChange({ preview: url });
		}
		catch (err) {
			console.error("Failed to extract video thumbnail:", err);
		}
		finally {
			this._extracting = false;
		}
	}

	private async _extractThumbnail(videoUrl: string): Promise<string> {
		const video = document.createElement("video");
		video.crossOrigin = "anonymous";
		video.src = videoUrl;
		video.muted = true;
		video.playsInline = true;

		await new Promise<void>((resolve, reject) => {
			video.onloadeddata = () => resolve();
			video.onerror = () => reject(new Error("Failed to load video"));
			video.load();
		});

		video.currentTime = 0.1;

		await new Promise<void>((resolve) => {
			video.onseeked = () => resolve();
		});

		const canvas = document.createElement("canvas");
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const ctx = canvas.getContext("2d");
		ctx.drawImage(video, 0, 0);

		const blob = await new Promise<Blob>((resolve) => {
			canvas.toBlob(resolve, "image/jpeg", 0.85);
		});

		// Cleanup
		video.src = "";
		video.load();

		const id = `video-thumb-${this.data.id || this.componentId}.jpg`;
		const result = await this.uploadFile({
			file: blob,
			id,
			mimeType: "image/jpeg",
			overwrite: true,
		});

		return result.url;
	}

	_volumeFormat = {
		format(value: number) {
			return value * 100;
		},
		parse(value: number) {
			return value / 100;
		},
	};

	gui: GuiGroupDescriptor = {
		type: "group",
		children: {
			preset: {
				type: "folder",
				label: "Parameters",
				children: {
					displayMode: {
						type: "select",
						value: [this.data, "displayMode"],
						items: ["flat", "curved"],
					},
					curvedAngle: {
						visible: () => this.data.displayMode === "curved",
						type: "number",
						value: [this.data, "curvedAngle"],
						min: 0,
						max: Math.PI / 4,
						step: 0.001,
					},
				},
			},
			transform: getTransformUI(this),

			opacity: {
				type: "folder",
				label: "Opacity",
				children: {
					opacity: {
						type: "number",
						value: [this.data, "opacity"],
						min: 0,
						max: 1,
						step: 0.01,
					},
				},
			},
			controls: {
				type: "folder",
				label: "Controls",
				children: {
					autoPlay: {
						type: "checkbox",
						value: [this.data, "autoPlay"],
						label: "Auto Play",
					},
					loadDistance: {
						type: "number",
						value: [this.data, "loadDistance"],
						label: "Load Distance",
						min: 1,
						max: 100,
						step: 0.5,
					},
					playAudioOpts: getAudioOptsUI([this.data, "audioType"]),
					audioRange: {
						visible: () => this.data.audioType === "spatial",
						type: "number",
						value: [this.data, "audioRange"],
						min: 1,
						max: 40,
						step: 0.1,
					},
					volume: {
						type: "number",
						value: [this.data, "volume"],
						format: this._volumeFormat,
						min: 0,
						max: 100,
						step: 1,
					},
				},
			},
			interaction: {
				type: "folder",
				label: "Interaction",
				children: {
					actionKey: {
						type: "select",
						label: "Action Key",
						value: [this.data, "actionKey"],
						items: ["", "E", "F", "G", "I"],
					},
					focusDistance: {
						type: "number",
						label: "Interaction Distance",
						value: [this.data, "focusDistance"],
						min: 1,
						max: 50,
						step: 0.5,
						visible: () => !!this.data.actionKey,
					},
				},
			},
			info: {
				type: "folder",
				label: "Info",
				children: {
					title: {
						type: "text",
						label: "Title",
						value: [this.data, "title"],
						visible: () => !!this.data.actionKey,
					},
					description: {
						type: "text",
						label: "Description",
						value: [this.data, "description"],
						visible: () => !!this.data.actionKey,
					},
					artist: {
						type: "text",
						label: "Artist",
						value: [this.data, "artist"],
						visible: () => !!this.data.actionKey,
					},
					infoBgColor: {
						type: "color",
						label: "Info BG Color",
						value: [this.data, "infoBgColor"],
						visible: () => !!this.data.actionKey,
					},
					infoTextColor: {
						type: "color",
						label: "Info Text Color",
						value: [this.data, "infoTextColor"],
						visible: () => !!this.data.actionKey,
					},
					infoOpacity: {
						type: "number",
						label: "Info Opacity",
						value: [this.data, "infoOpacity"],
						min: 0,
						max: 100,
						step: 1,
						visible: () => !!this.data.actionKey,
					},
					buttons: {
						type: "array",
						label: "Buttons",
						value: [this.data, "buttons"],
						visible: () => !!this.data.actionKey,
						itemGui: (index: number) => ({
							type: "folder",
							label: `Button ${index + 1}`,
							children: {
								action: {
									type: "select",
									label: "Action",
									value: [this.data.buttons[index], "action"],
									items: ["popup", "redirect"],
								},
								text: {
									type: "text",
									label: "Text",
									value: [this.data.buttons[index], "text"],
								},
								link: {
									type: "text",
									label: "URL",
									value: [this.data.buttons[index], "link"],
								},
							},
						}),
					},
				},
			},
			border: {
				type: "folder",
				label: "Border",
				children: {
					hasBorder: {
						type: "checkbox",
						value: [this.data, "hasBorder"],
						label: "Has Border",
					},
					borderSize: {
						visible: () => this.data.hasBorder,
						type: "number",
						value: [this.data, "borderSize"],
						min: 0,
						max: 1,
						step: 0.01,
					},
					borderDepth: {
						visible: () => this.data.hasBorder,
						type: "number",
						value: [this.data, "borderDepth"],
						min: 0.01,
						max: 1,
						step: 0.01,
					},
					borderColor: {
						visible: () => this.data.hasBorder,
						type: "color",
						value: [this.data, "borderColor"],
					},
					borderOpacity: {
						visible: () => this.data.hasBorder,
						type: "number",
						value: [this.data, "borderOpacity"],
						min: 0,
						max: 1,
						step: 0.01,
					},
				},
			},
		},
	};

	getGUI(): GuiGroupDescriptor {
		return this.gui;
	}
}
