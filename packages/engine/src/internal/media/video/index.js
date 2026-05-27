// @ts-check

import { SRGBColorSpace, VideoTexture } from "three";

import Textures from "../../textures";

import Wrapper from './wrapper';

import { Assets } from "../../resources/assets";

export class VideoFactory {
	constructor() {
		this.instances = {};
	}

	/**
	 * Get a video wrapper with preview only (no video element loaded).
	 * Use loadVideo() later to attach the actual video.
	 */
	async getPreviewOnly(parent, data) {
		if (Textures.isLock(data.preview) == true) {
			await Textures.loadOnce({ name: data.preview, url: data.preview });
		}

		if (this.instances[data.url + data.preview] == null) {
			var preview = data.preview;

			if (preview == null || preview.endsWith(".mp4")) {
				preview = Assets.textures.impact;
			}

			const previewTexture = await Textures.loadOnce({
				name: preview,
				url: preview,
			});

			previewTexture.colorSpace = SRGBColorSpace;

			previewTexture.ratio =
				previewTexture.source.data.width /
				previewTexture.source.data.height;

			Textures.unlock(preview);

			this.instances[data.url + data.preview] = {
				previewTexture: previewTexture,
				content: [],
			};
		}

		var wrapper = new Wrapper(
			this.instances[data.url + data.preview],
			{ video: null, videoTexture: null },
			data
		);

		// Set scaleRatio from preview texture when no video is loaded
		wrapper.scaleRatio = this.instances[data.url + data.preview].previewTexture.ratio || 1;

		this.instances[data.url + data.preview].content.push(wrapper);

		parent.add(wrapper);

		return wrapper;
	}

	/**
	 * Load the actual video element and attach it to an existing wrapper.
	 * Returns the video element for audio setup.
	 */
	async loadVideo(wrapper, url) {
		if (wrapper.videoData?.video) return wrapper.videoData.video;

		const video = await this.getVideo(url);
		const videoTexture = new VideoTexture(video);
		videoTexture.colorSpace = SRGBColorSpace;
		videoTexture.generateMipmaps = false;

		wrapper.videoData = { video, videoTexture };
		wrapper.scaleRatio = video.videoWidth / video.videoHeight;
		wrapper.scale.set(wrapper.scaleRatio, 1, 1);

		return video;
	}

	/**
	 * Original combined method — loads preview + video together.
	 * Kept for backwards compatibility.
	 */
	async get(parent, data) {
		const wrapper = await this.getPreviewOnly(parent, data);

		if (data.url) {
			await this.loadVideo(wrapper, data.url);
		}

		return wrapper;
	}

	dispose(instance) {
		//
	}

	disposeAll() {
		for (let url in this.instances) {
			let i = 0;

			while (i < this.instances[url].content.length) {
				if (this.instances[url].content[i].parent) {
					this.instances[url].content[i].parent.remove(
						this.instances[url].content[i]
					);
				}

				this.instances[url].content[i].dispose();

				this.instances[url].content[i] = null;

				Textures.remove(url);

				i++;
			}
		}

		this.instances = {};
	}

	async getVideo(url) {
		//
		var video = document.createElement("video");

		video.crossOrigin = "anonymous";
		video.playsInline = true;
		video.muted = true;
		video.loop = true;

		video.src = url;

		var ps = new Promise((resolve, reject) => {
			video.onloadeddata = (event) => {
				resolve();
			};

			video.onerror = (event) => {
				console.error("video.onerror", event);

				reject();
			};
		});

		video.load();

		await ps;

		return video;
	}
}
