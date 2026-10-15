import {
	Box3,
	Color,
	Mesh,
	MeshBasicMaterial,
	PlaneGeometry,
	SRGBColorSpace,
	Texture,
	TextureLoader,
	Vector3,
	VideoTexture,
} from "three";
import { Component3D } from "../../abstract/component-3d";
import { IS_EDIT_MODE, USER_INTERACTED } from "../../../internal/constants";
import Camera from "../../../camera";
import { PositionalAudio } from "../../../internal/utils/positional-audio";
import type {
	VideoScreenComponentData,
	VideoScreenItem,
	VideoScreenLoop,
	VideoScreenPlayback,
} from "./video-screen-data";

export type {
	VideoScreenComponentData,
	VideoScreenItem,
	VideoScreenLoop,
	VideoScreenPlayback,
} from "./video-screen-data";

const SCREEN_EVENTS = {
	PLAYBACK: "PLAYBACK",
	DURATION: "DURATION",
	ENDED: "ENDED",
} as const;

/** Seek when the video is further than this (seconds) from where it should be. */
const MAX_DRIFT = 1;
/** How often (seconds) playback is checked against the shared position. */
const SYNC_INTERVAL = 0.5;

const _camPos = new Vector3();
const _screenPos = new Vector3();
const _worldScale = new Vector3();

let _geometry: PlaneGeometry | null = null;
function getGeometry(): PlaneGeometry {
	if (!_geometry) _geometry = new PlaneGeometry(1, 1);
	return _geometry;
}

/** Playback when nothing has been applied: nothing loaded, data defaults. */
function idlePlayback(data: VideoScreenComponentData): VideoScreenPlayback {
	return {
		index: -1,
		playing: false,
		position: 0,
		at: Date.now(),
		volume: data.volume ?? 0.75,
		muted: false,
		loop: data.loop ?? "all",
	};
}

/**
 * @public
 *
 * A screen with a playlist of videos, letterboxed to the screen's size.
 *
 * What the screen plays is described by a {@link VideoScreenPlayback}. On its
 * own the screen drives that itself (`autoPlay`, advancing through the
 * playlist). A multiplayer game instead shares one playback between everyone
 * and calls {@link applyPlayback} on each client; the screen then follows it,
 * seeking whenever it drifts, and leaves decisions such as "play the next
 * video" to the game (see {@link onEnded} and {@link onDuration}).
 *
 * Videos only load within `loadDistance` of the camera, and catch up to the
 * shared position when the player comes back in range.
 *
 * @example
 * const screen = space.components.byId("cinema") as VideoScreenComponent;
 * screen.applyPlayback({ ...screen.playback, index: 0, playing: true, position: 0, at: Date.now() });
 */
export class VideoScreenComponent extends Component3D<VideoScreenComponentData> {

	private _background: Mesh<PlaneGeometry, MeshBasicMaterial> = null;
	private _screen: Mesh<PlaneGeometry, MeshBasicMaterial> = null;
	private _video: HTMLVideoElement = null;
	private _videoTexture: VideoTexture = null;
	private _idleTexture: Texture = null;
	private _idleImageUrl: string = null;
	private _posAudio: PositionalAudio = null;

	private _playback: VideoScreenPlayback;
	/** Playback is driven by the game (applyPlayback), not by the screen itself. */
	private _controlled = false;
	private _loadedUrl: string = null;
	private _hasFrame = false;
	private _inRange = IS_EDIT_MODE;
	private _sinceSync = SYNC_INTERVAL;
	private _cleanup: (() => void) | null = null;

	/** @internal */
	protected async init() {
		this._playback = idlePlayback(this.data);

		this._background = new Mesh(getGeometry(), new MeshBasicMaterial({ toneMapped: false }));
		this.add(this._background);

		this._screen = new Mesh(
			getGeometry(),
			new MeshBasicMaterial({
				toneMapped: false,
				polygonOffset: true,
				polygonOffsetFactor: -2,
				polygonOffsetUnits: -8,
			}),
		);
		this._screen.visible = false;
		this.add(this._screen);

		this._updateLook();
		await this._loadIdleImage();

		// The studio shows the first frame of the first video.
		if (IS_EDIT_MODE && this.playlist.length) {
			this._playback = { ...this._playback, index: 0, position: 0.1 };
		}

		this._cleanup = this.space.use({ onFrame: this._onFrame });
	}

	/** @internal */
	async _onReady() {
		if (IS_EDIT_MODE || this._controlled) return;
		if (this.data.autoPlay && this.playlist.length) {
			this._setPlayback({ ...this._playback, index: this._nextIndex(-1), playing: true, position: 0, at: Date.now() });
		}
	}

	// --- Public API ---

	/** The playlist, without entries that have no URL. */
	get playlist(): VideoScreenItem[] {
		return (this.data.playlist ?? []).filter((item) => item && item.url);
	}

	/** What the screen is playing, as last applied. */
	get playback(): VideoScreenPlayback {
		return { ...this._playback };
	}

	/** The playlist entry being played, if any. */
	get currentItem(): VideoScreenItem | null {
		return this.playlist[this._playback.index] ?? null;
	}

	/** Where playback should be now, in seconds. */
	get currentTime(): number {
		return this._expectedTime();
	}

	/** Length of the current video in seconds, once known. */
	get duration(): number {
		const d = this._video?.duration;
		return this._loadedUrl && Number.isFinite(d) ? d : 0;
	}

	get isPlaying(): boolean {
		return this._playback.playing && this._playback.index >= 0;
	}

	/**
	 * Follow this playback from now on. The screen stops advancing through
	 * its playlist by itself; the caller decides what happens at the end.
	 */
	applyPlayback(playback: VideoScreenPlayback) {
		this._controlled = true;
		this._setPlayback(playback);
	}

	/** Called whenever the playback changes. */
	onPlayback(cb: (playback: VideoScreenPlayback) => void) {
		return this.on(SCREEN_EVENTS.PLAYBACK, cb);
	}

	/** Called once the length of a newly loaded video is known. */
	onDuration(cb: (e: { index: number; duration: number }) => void) {
		return this.on(SCREEN_EVENTS.DURATION, cb);
	}

	/** Called when a video plays to its end (never while looping one). */
	onEnded(cb: (e: { index: number }) => void) {
		return this.on(SCREEN_EVENTS.ENDED, cb);
	}

	// --- Playback ---

	private _setPlayback(playback: VideoScreenPlayback) {
		const prev = this._playback;
		this._playback = { ...playback };
		this._sinceSync = SYNC_INTERVAL; // apply on the next frame

		if (prev.index !== playback.index) this._hasFrame = false;
		this.emit(SCREEN_EVENTS.PLAYBACK, this.playback);
	}

	private _expectedTime(): number {
		const { playing, position, at, loop } = this._playback;
		let time = playing ? position + Math.max(0, Date.now() - at) / 1000 : position;
		const duration = this.duration;
		if (duration > 0) {
			time = loop === "one" ? time % duration : Math.min(time, duration);
		}
		return Math.max(0, time);
	}

	/** Next playlist index after `from` that has a URL, wrapping around. */
	private _nextIndex(from: number, step = 1): number {
		const count = this.playlist.length;
		if (count === 0) return -1;
		return (((from + step) % count) + count) % count;
	}

	private _onFrame = (dt: number) => {
		this._updateLook();
		this._updateRange();

		this._sinceSync += dt;
		if (this._sinceSync < SYNC_INTERVAL) return;
		this._sinceSync = 0;
		this._sync();
	};

	private _updateRange() {
		if (IS_EDIT_MODE) return;
		Camera.current.getWorldPosition(_camPos);
		this.getWorldPosition(_screenPos);
		const inRange = _camPos.distanceTo(_screenPos) <= (this.data.loadDistance ?? 40);
		if (inRange !== this._inRange) {
			this._inRange = inRange;
			this._sinceSync = SYNC_INTERVAL;
		}
	}

	/** Bring the video element in line with the playback. */
	private _sync() {
		const item = this.currentItem;

		if (!item) {
			this._unload();
			return;
		}
		if (!this._inRange) {
			this._video?.pause();
			return;
		}

		const video = this._ensureVideo();
		if (this._loadedUrl !== item.url) {
			this._loadedUrl = item.url;
			this._hasFrame = false;
			video.src = item.url;
			video.load();
			return; // continue once metadata is in (see _ensureVideo)
		}
		if (video.readyState < 1) return;

		video.loop = this._playback.loop === "one";

		// A playing screen only corrects real drift; a paused one shows the exact frame.
		const expected = this._expectedTime();
		const drift = Math.abs(video.currentTime - expected);
		if (drift > (this._playback.playing ? MAX_DRIFT : 0.05)) {
			video.currentTime = expected;
		}

		if (this._playback.playing && video.paused && !video.ended) {
			video.play().catch(() => {
				// Not allowed to play with sound yet: muted video still starts.
				if (!video.muted) {
					video.muted = true;
					video.play().catch(() => {});
				}
			});
		}
		else if (!this._playback.playing && !video.paused) {
			video.pause();
		}
	}

	private _ensureVideo(): HTMLVideoElement {
		if (this._video) return this._video;

		const video = document.createElement("video");
		video.crossOrigin = "anonymous";
		video.playsInline = true;
		video.preload = "auto";
		video.muted = true; // the audio manager unmutes after the first user interaction

		video.addEventListener("loadedmetadata", () => {
			this._sinceSync = SYNC_INTERVAL;
			if (Number.isFinite(video.duration)) {
				this.emit(SCREEN_EVENTS.DURATION, { index: this._playback.index, duration: video.duration });
			}
		});
		video.addEventListener("loadeddata", () => {
			this._hasFrame = true;
			this._updateLook();
		});
		video.addEventListener("ended", this._onVideoEnded);
		video.addEventListener("error", () => {
			if (this._loadedUrl) console.warn(`[video-screen] Can't play ${this._loadedUrl}`);
		});

		this._video = video;
		this._videoTexture = new VideoTexture(video);
		this._videoTexture.colorSpace = SRGBColorSpace;
		this._videoTexture.generateMipmaps = false;

		if (!IS_EDIT_MODE) {
			this.container._audioManager.addAudioSource(this, video, () => ({
				audioType: this.data.audioType ?? "spatial",
				volume: this._playback.volume,
				muted: this._playback.muted,
			}));

			USER_INTERACTED.then(() => {
				if (this._video !== video) return;
				this._posAudio = new PositionalAudio();
				this.add(this._posAudio);
				this._posAudio.setSource(video);
				this._updateAudioType();
			});
		}

		return video;
	}

	private _onVideoEnded = () => {
		const { index, loop } = this._playback;
		if (loop === "one") return;

		this.emit(SCREEN_EVENTS.ENDED, { index });
		if (this._controlled) return;

		// On its own the screen advances through the playlist itself.
		if (loop === "all") {
			this._setPlayback({ ...this._playback, index: this._nextIndex(index), position: 0, at: Date.now() });
		}
		else {
			this._setPlayback({ ...this._playback, playing: false, position: this.duration });
		}
	};

	private _unload() {
		if (!this._video || !this._loadedUrl) return;
		this._video.pause();
		this._video.removeAttribute("src");
		this._video.load();
		this._loadedUrl = null;
		this._hasFrame = false;
		this._updateLook();
	}

	private _updateAudioType() {
		if (!this._posAudio) return;
		this._posAudio.setAudioType(this.data.audioType ?? "spatial", this.data.audioRange ?? 15);
		if ((this.data.audioType ?? "spatial") === "spatial") {
			this._posAudio.setVolumeRange(this.data.audioRange ?? 15);
		}
	}

	// --- Look ---

	private async _loadIdleImage() {
		const url = this.data.idleImage || null;
		if (url === this._idleImageUrl) return;
		this._idleImageUrl = url;

		this._idleTexture?.dispose();
		this._idleTexture = null;
		if (!url) return this._updateLook();

		try {
			const texture = await new TextureLoader().loadAsync(url);
			if (this._idleImageUrl !== url) return texture.dispose();
			texture.colorSpace = SRGBColorSpace;
			this._idleTexture = texture;
		}
		catch {
			console.warn(`[video-screen] Can't load idle image ${url}`);
		}
		this._updateLook();
	}

	/** Show the video (or idle image) letterboxed inside the screen. */
	private _updateLook() {
		if (!this._screen) return;

		this._background.material.color.set(this.data.backgroundColor || "#000000");

		const showVideo = this._hasFrame && this._loadedUrl != null && this._video?.videoWidth > 0;
		const texture = showVideo ? this._videoTexture : this._idleTexture;
		const material = this._screen.material;
		if (material.map !== texture) {
			material.map = texture;
			material.needsUpdate = true;
		}
		this._screen.visible = texture != null;
		if (!texture) return;

		const contentAspect = showVideo
			? this._video.videoWidth / this._video.videoHeight
			: (texture.image?.width || 1) / (texture.image?.height || 1);

		this.getWorldScale(_worldScale);
		const screenAspect = Math.abs(_worldScale.x / (_worldScale.y || 1)) || 1;

		if (contentAspect > screenAspect) this._screen.scale.set(1, screenAspect / contentAspect, 1);
		else this._screen.scale.set(contentAspect / screenAspect, 1, 1);
	}

	/** @internal */
	onDataChange() {
		this._updateLook();
		this._updateAudioType();
		void this._loadIdleImage();
		this._playback.loop = this._controlled ? this._playback.loop : (this.data.loop ?? "all");
		if (!this._controlled) this._playback.volume = this.data.volume ?? 0.75;

		// A playlist edit can remove the entry being played.
		if (this._playback.index >= this.playlist.length) {
			this._setPlayback({ ...this._playback, index: this.playlist.length ? 0 : -1, position: IS_EDIT_MODE ? 0.1 : 0 });
		}
		else if (IS_EDIT_MODE && this._playback.index < 0 && this.playlist.length) {
			this._setPlayback({ ...this._playback, index: 0, position: 0.1 });
		}
	}

	/** @internal */
	_onCreateCollisionMesh() {
		const mesh = new Mesh(getGeometry(), new MeshBasicMaterial({ color: new Color("#ffffff"), wireframe: true }));
		mesh.visible = false;
		return mesh;
	}

	protected _getBBoxImp(target: Box3) {
		return target.setFromObject(this.getCollisionMesh());
	}

	/** @internal */
	protected dispose() {
		this._cleanup?.();
		this._cleanup = null;

		this.container._audioManager.removeAudioSource(this);
		this._posAudio?.dispose();
		this._posAudio = null;

		if (this._video) {
			this._video.removeEventListener("ended", this._onVideoEnded);
			this._video.pause();
			this._video.removeAttribute("src");
			this._video.load();
			this._video = null;
		}
		this._videoTexture?.dispose();
		this._idleTexture?.dispose();
		this._background?.material.dispose();
		this._screen?.material.dispose();
	}
}
