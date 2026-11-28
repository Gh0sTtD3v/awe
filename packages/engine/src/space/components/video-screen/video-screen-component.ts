import {
	Box3,
	BoxGeometry,
	Color,
	EdgesGeometry,
	LineBasicMaterial,
	LineSegments,
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
import { DEFAULT_PLAY_AREA } from "./video-screen-data";
import type {
	VideoScreenComponentData,
	VideoScreenItem,
	VideoScreenLoop,
	VideoScreenPlayArea,
	VideoScreenPlayback,
} from "./video-screen-data";

export type {
	VideoScreenComponentData,
	VideoScreenItem,
	VideoScreenLoop,
	VideoScreenPlayArea,
	VideoScreenPlayback,
} from "./video-screen-data";
export { DEFAULT_PLAY_AREA } from "./video-screen-data";

const SCREEN_EVENTS = {
	PLAYBACK: "PLAYBACK",
	DURATION: "DURATION",
	ENDED: "ENDED",
} as const;

/**
 * Seek when a playing video is further than this (seconds) from where it
 * should be. Smaller drift is eased out with the playback rate instead, since
 * every seek throws away the buffer and stalls the picture.
 */
const MAX_DRIFT = 3;
/** Drift (seconds) below which a playing video is left alone. */
const SOFT_DRIFT = 0.25;
/** How much faster or slower a drifting video plays while it catches up. */
const CATCH_UP_RATE = 0.05;
/** A new playback whose position differs by more than this (seconds) is a seek. */
const JUMP_THRESHOLD = 0.5;
/** How often (seconds) playback is checked against the shared position. */
const SYNC_INTERVAL = 0.5;
/** No arrival ad for a viewer who saw an ad on this screen this recently (ms). */
const ARRIVAL_AD_COOLDOWN_MS = 2 * 60 * 1000;
/**
 * A viewer this far (seconds) from the shared position jumps to it even if
 * that means buffering again. Below it, a slow connection is allowed to lag
 * rather than chase the live position (each chase seek restarts the download).
 */
const MAX_LAG = 45;
/** Seek this far (seconds) ahead of live when joining, bounded by how long loading actually takes. */
const MIN_JOIN_LEAD = 1;
const MAX_JOIN_LEAD = 6;
/** This many stalls within STALL_WINDOW_MS put the video in patient mode: no chasing at all. */
const STALL_LIMIT = 3;
const STALL_WINDOW_MS = 20_000;

const _camPos = new Vector3();
const _viewerLocal = new Vector3();
const _worldScale = new Vector3();

function isHls(url: string): boolean {
	return /\.m3u8($|[?#])/i.test(url);
}

/** Is `time` inside what the video has already downloaded? */
function isBuffered(video: HTMLVideoElement, time: number): boolean {
	const ranges = video.buffered;
	for (let i = 0; i < ranges.length; i++) {
		if (time >= ranges.start(i) && time <= ranges.end(i) - 0.5) return true;
	}
	return false;
}

let _areaEdges: EdgesGeometry | null = null;
const areaEdges = () => (_areaEdges ??= new EdgesGeometry(new BoxGeometry(1, 1, 1)));

let _geometry: PlaneGeometry | null = null;
function getGeometry(): PlaneGeometry {
	if (!_geometry) _geometry = new PlaneGeometry(1, 1);
	return _geometry;
}

/** Playback when nothing has been applied: nothing loaded, data defaults. */
function idlePlayback(data: VideoScreenComponentData): VideoScreenPlayback {
	return {
		index: -1,
		ad: -1,
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
 * shared position when the player comes back in range. A viewer who arrives
 * while a video is playing first sees one of the screen's ads, just for them,
 * then joins the video live.
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
	/** URL of the current video if it failed to load. */
	private _failedUrl: string = null;
	/** The viewer is inside the playback box (always true in the studio). */
	private _inArea = IS_EDIT_MODE;
	/** Where the viewer is, set by the game (its avatar); the camera if never set. */
	private _viewer: Vector3 | null = null;
	/** Studio-only wireframe of the playback box. */
	private _areaHelper: LineSegments | null = null;
	/** hls.js player for `.m3u8` items where the browser can't play HLS itself. */
	private _hls: any = null;
	/** The video is waiting for data. */
	private _buffering = false;
	private _stalls: number[] = [];
	/** Stalled repeatedly on this video: stop trying to keep up with the live position. */
	private _patient = false;
	/** When the current source started loading, to size the join lead. */
	private _loadStartedAt = 0;
	/** Seconds to seek ahead of live when joining mid-video. */
	private _joinLead = MIN_JOIN_LEAD;
	private _sinceSync = SYNC_INTERVAL;
	/** Jump straight to the expected time on the next sync: new video, or playback was changed. */
	private _seekPending = true;
	private _cleanup: (() => void) | null = null;
	/** Ad playing only for this viewer before joining the video (index into `ads`), or -1. */
	private _arrivalAd = -1;
	/** When this viewer last finished watching an ad here. */
	private _lastAdAt = -Infinity;

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
		// Just in front of the background, so the two never z-fight.
		this._screen.position.z = 0.002;
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
		if (this.data.autoPlay && this.playlist.length) this._startVideo(0);
	}

	private _adCursor = 0;

	/** Standalone only: start a video from the top, after the next ad if there are any. */
	private _startVideo(index: number) {
		const adCount = this.ads.length;
		const ad = adCount > 0 ? this._adCursor++ % adCount : -1;
		this._setPlayback({ ...this._playback, index, ad, playing: true, position: 0, at: Date.now() });
	}

	// --- Public API ---

	/** The playlist, without entries that have no URL. */
	get playlist(): VideoScreenItem[] {
		return (this.data.playlist ?? []).filter((item) => item && item.url);
	}

	/** The ads, without entries that have no URL. */
	get ads(): VideoScreenItem[] {
		return (this.data.ads ?? []).filter((item) => item && item.url);
	}

	/** An ad is playing (before the video at `playback.index`). */
	get isAd(): boolean {
		return (this._playback.ad ?? -1) >= 0 && this.ads[this._playback.ad] != null;
	}

	/** What the screen is playing, as last applied. */
	get playback(): VideoScreenPlayback {
		return { ...this._playback };
	}

	/** What's on screen: the ad, or else the playlist entry. */
	get currentItem(): VideoScreenItem | null {
		if (this._playback.index < 0) return null;
		return this.isAd ? this.ads[this._playback.ad] : (this.playlist[this._playback.index] ?? null);
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

	/** The current video couldn't be loaded (missing, blocked, or no CORS headers). */
	get loadError(): boolean {
		return this._failedUrl != null && this._failedUrl === this._loadedUrl;
	}

	get isPlaying(): boolean {
		return this._playback.playing && this._playback.index >= 0;
	}

	/** The video is waiting for data (slow connection). */
	get buffering(): boolean {
		return this._buffering && this._loadedUrl != null;
	}

	/** The viewer is inside the playback box: the video loads and is heard. */
	get inArea(): boolean {
		return this._inArea;
	}

	/** The playback box, with defaults filled in. */
	get playArea(): VideoScreenPlayArea {
		const area = this.data.playArea;
		return {
			size: { ...DEFAULT_PLAY_AREA.size, ...(area?.size ?? {}) },
			offset: { ...DEFAULT_PLAY_AREA.offset, ...(area?.offset ?? {}) },
		};
	}

	/**
	 * Tell the screen where the viewer is (e.g. the local player's avatar), so
	 * the playback box follows the player rather than the camera. Pass null to
	 * go back to using the camera.
	 */
	setViewerPosition(position: { x: number; y: number; z: number } | null) {
		if (!position) this._viewer = null;
		else (this._viewer ??= new Vector3()).set(position.x, position.y, position.z);
	}

	/** Is this world-space point inside the playback box? */
	containsPoint(point: { x: number; y: number; z: number }): boolean {
		const { size, offset } = this.playArea;
		this.updateWorldMatrix(true, false);
		_viewerLocal.set(point.x, point.y, point.z);
		this.worldToLocal(_viewerLocal);
		// Local units are scaled by the screen's size; the box is in metres.
		this.getWorldScale(_worldScale);
		_viewerLocal.multiply(_worldScale);
		return (
			Math.abs(_viewerLocal.x - offset.x) <= Math.abs(size.x) / 2 &&
			Math.abs(_viewerLocal.y - offset.y) <= Math.abs(size.y) / 2 &&
			Math.abs(_viewerLocal.z - offset.z) <= Math.abs(size.z) / 2
		);
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

	/** Called once the length of a newly loaded video or ad (`ad` ≥ 0) is known. */
	onDuration(cb: (e: { index: number; ad: number; duration: number }) => void) {
		return this.on(SCREEN_EVENTS.DURATION, cb);
	}

	/** Called when a video plays to its end (never while looping one). */
	onEnded(cb: (e: { index: number; ad: number }) => void) {
		return this.on(SCREEN_EVENTS.ENDED, cb);
	}

	// --- Playback ---

	private _setPlayback(playback: VideoScreenPlayback) {
		const prevUrl = this.currentItem?.url ?? null;
		const prevPlaying = this._playback.playing;
		const prevTime = this._expectedTime();
		this._playback = { ...playback };
		this._sinceSync = SYNC_INTERVAL; // apply on the next frame

		// The shared playback moved on to its own ad, or stopped: drop the arrival ad and follow it.
		if (this._arrivalAd >= 0 && (this.isAd || !this.isPlaying)) this._arrivalAd = -1;
		if (this._arrivalAd >= 0) {
			// Still showing the arrival ad; the video catches up once it ends.
			this.emit(SCREEN_EVENTS.PLAYBACK, this.playback);
			return;
		}

		// Only a different video loses the frame. Queuing a video during an ad keeps the ad on screen.
		const urlChanged = (this.currentItem?.url ?? null) !== prevUrl;
		if (urlChanged) this._hasFrame = false;

		// Jump only when the playback really moved (a seek, play/pause, another
		// video). Re-sent state, e.g. after a duration report, must not seek.
		if (urlChanged || prevPlaying !== this._playback.playing || Math.abs(this._expectedTime() - prevTime) > JUMP_THRESHOLD) {
			this._seekPending = true;
		}
		this.emit(SCREEN_EVENTS.PLAYBACK, this.playback);
	}

	private _expectedTime(): number {
		const { playing, position, at, loop } = this._playback;
		let time = playing ? position + Math.max(0, Date.now() - at) / 1000 : position;
		const duration = this.duration;
		if (duration > 0) {
			time = loop === "one" && !this.isAd ? time % duration : Math.min(time, duration);
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
		this._updateArea();

		this._sinceSync += dt;
		if (this._sinceSync < SYNC_INTERVAL) return;
		this._sinceSync = 0;
		this._sync();
	};

	/** Enter or leave the playback box. In the studio, draw it instead. */
	private _updateArea() {
		if (IS_EDIT_MODE) return this._updateAreaHelper();

		const viewer = this._viewer ?? Camera.current.getWorldPosition(_camPos);
		const inArea = this.containsPoint(viewer);
		if (inArea === this._inArea) return;

		this._inArea = inArea;
		this._sinceSync = SYNC_INTERVAL;
		if (inArea) {
			this._seekPending = true;
			this._startArrivalAd();
		}
		else {
			// Walked off mid-ad: it didn't count, so coming back shows one again.
			this._arrivalAd = -1;
			// Nothing downloads for someone who isn't watching.
			this._unload();
		}
	}

	/** Wireframe of the playback box, kept in metres whatever the screen's size. */
	private _updateAreaHelper() {
		if (!this._areaHelper) {
			this._areaHelper = new LineSegments(
				areaEdges(),
				new LineBasicMaterial({ color: "#4fc3f7", transparent: true, opacity: 0.8, depthWrite: false }),
			);
			this._areaHelper.name = "video-screen-play-area";
			this._areaHelper.raycast = () => {}; // never picked instead of the screen
			this.add(this._areaHelper);
		}
		const { size, offset } = this.playArea;
		this.getWorldScale(_worldScale);
		const sx = _worldScale.x || 1;
		const sy = _worldScale.y || 1;
		const sz = _worldScale.z || 1;
		this._areaHelper.scale.set(Math.abs(size.x) / sx, Math.abs(size.y) / sy, Math.abs(size.z) / sz);
		this._areaHelper.position.set(offset.x / sx, offset.y / sy, offset.z / sz);
	}

	/** Arriving at a screen mid-video: play one ad for this viewer before joining it. */
	private _startArrivalAd() {
		const ads = this.ads;
		if (!ads.length || this.isAd || !this.isPlaying || !this.currentItem) return;
		if (Date.now() - this._lastAdAt < ARRIVAL_AD_COOLDOWN_MS) return;
		this._arrivalAd = this._adCursor++ % ads.length;
		this._hasFrame = false;
		this._seekPending = true;
	}

	private _endArrivalAd() {
		this._arrivalAd = -1;
		this._lastAdAt = Date.now();
		this._hasFrame = false;
		this._seekPending = true;
		this._sinceSync = SYNC_INTERVAL;
	}

	/** What this viewer sees: the arrival ad, else the shared item. */
	private _shownItem(): VideoScreenItem | null {
		if (this._arrivalAd >= 0) {
			const ad = this.ads[this._arrivalAd];
			if (ad) return ad;
			this._arrivalAd = -1;
		}
		return this.currentItem;
	}


	/** Bring the video element in line with the playback. */
	private _sync() {
		const item = this._shownItem();
		const arrivalAd = this._arrivalAd >= 0;
		// Watching the shared ad counts too: no arrival ad right after it.
		if (this._inArea && this.isAd && !arrivalAd) this._lastAdAt = Date.now();

		if (!item) {
			this._unload();
			return;
		}
		// Outside the box nothing is downloaded (see _updateArea).
		if (!this._inArea) return;

		const video = this._ensureVideo();
		if (this._loadedUrl !== item.url) {
			this._loadSource(video, item.url);
			return; // continue once metadata is in (see _ensureVideo)
		}
		if (video.readyState < 1) return;

		// Only fetch ahead for something that's actually playing.
		const wantsData = arrivalAd || this._playback.playing;
		video.preload = wantsData ? "auto" : "metadata";

		video.loop = !arrivalAd && this._playback.loop === "one" && !this.isAd;
		this._correctDrift(video);

		if ((arrivalAd || this._playback.playing) && video.paused && !video.ended) {
			video.play().catch(() => {
				// Not allowed to play with sound yet: muted video still starts.
				if (!video.muted) {
					video.muted = true;
					video.play().catch(() => {});
				}
			});
		}
		else if (!arrivalAd && !this._playback.playing && !video.paused) {
			video.pause();
		}
	}

	/** Point the video at a new source: plain file, native HLS (Safari) or hls.js. */
	private _loadSource(video: HTMLVideoElement, url: string) {
		this._destroyHls();
		this._loadedUrl = url;
		this._hasFrame = false;
		this._failedUrl = null;
		this._seekPending = true;
		this._buffering = true;
		this._stalls = [];
		this._patient = false;
		this._loadStartedAt = performance.now();

		if (isHls(url) && !video.canPlayType("application/vnd.apple.mpegurl")) {
			video.removeAttribute("src");
			void import("hls.js").then(({ default: Hls }) => {
				// Moved on (or left the box) while hls.js was loading.
				if (this._loadedUrl !== url || this._video !== video) return;
				if (!Hls.isSupported()) {
					this._failedUrl = url;
					return;
				}
				// A small forward buffer leaves bandwidth for the game connection;
				// quality adapts to the measured speed.
				const hls = new Hls({ maxBufferLength: 20, maxMaxBufferLength: 40, capLevelToPlayerSize: true });
				hls.on(Hls.Events.ERROR, (_e: unknown, info: { fatal?: boolean }) => {
					if (info?.fatal && this._loadedUrl === url) this._failedUrl = url;
				});
				hls.loadSource(url);
				hls.attachMedia(video);
				this._hls = hls;
			});
			return;
		}

		video.src = url;
		video.load();
	}

	private _destroyHls() {
		this._hls?.destroy();
		this._hls = null;
	}

	/** Seek, telling the browser exactly where; also marks the start of a (re)load. */
	private _seek(video: HTMLVideoElement, time: number) {
		const duration = Number.isFinite(video.duration) ? video.duration : Infinity;
		video.currentTime = Math.max(0, Math.min(time, duration - 0.1));
	}

	/**
	 * Where to land when jumping to the shared position. If that point is
	 * already downloaded, exactly there; otherwise a little ahead, so that by
	 * the time the data arrives the video is close to live instead of behind.
	 */
	private _jumpTarget(video: HTMLVideoElement, expected: number): number {
		if (!this._playback.playing || isBuffered(video, expected)) return expected;
		return expected + this._joinLead;
	}

	/**
	 * Keep the video at the shared position without stalling on a slow
	 * connection. Every seek throws the download away, so:
	 * - jumps happen for a new video or a changed playback, landing slightly
	 *   ahead of live when the data isn't there yet;
	 * - a viewer who falls behind while buffering keeps playing from where they
	 *   are, and only jumps if the target is already downloaded or they're
	 *   more than MAX_LAG behind;
	 * - small drift is eased out with the playback rate, once enough is buffered;
	 * - after repeated stalls ("patient" mode) it stops chasing altogether.
	 */
	private _correctDrift(video: HTMLVideoElement) {
		// The arrival ad plays from the top at its own pace, whatever the loading took.
		if (this._arrivalAd >= 0) {
			if (this._seekPending) {
				this._seekPending = false;
				video.playbackRate = 1;
				if (video.currentTime > 0.05) video.currentTime = 0;
			}
			return;
		}

		const expected = this._expectedTime();
		const behind = expected - video.currentTime;

		// A new video, play/pause, or a seek by whoever controls the screen.
		if (this._seekPending || !this._playback.playing) {
			this._seekPending = false;
			video.playbackRate = 1;
			if (Math.abs(behind) > 0.05) this._seek(video, this._jumpTarget(video, expected));
			return;
		}
		// Mid-seek or waiting for data: any further seek would restart the download.
		if (video.seeking || this._buffering || video.readyState < video.HAVE_FUTURE_DATA) return;

		const drift = Math.abs(behind);
		if (drift > MAX_LAG) {
			// Hopelessly far off: rejoin live, accepting one more buffer.
			video.playbackRate = 1;
			this._seek(video, this._jumpTarget(video, expected));
		}
		else if (drift > MAX_DRIFT) {
			// Jump only if the target is already downloaded (instant); otherwise
			// keep playing and catch up gently rather than stall again.
			if (isBuffered(video, expected)) {
				video.playbackRate = 1;
				this._seek(video, expected);
			}
			else {
				video.playbackRate = this._catchUpRate(video, behind);
			}
		}
		else if (drift > SOFT_DRIFT) {
			video.playbackRate = this._catchUpRate(video, behind);
		}
		else {
			video.playbackRate = 1;
		}
	}

	/** Slightly faster or slower to close drift; normal speed when the connection can't afford it. */
	private _catchUpRate(video: HTMLVideoElement, behind: number): number {
		if (this._patient) return 1;
		// Playing faster needs data to spare.
		if (behind > 0 && video.readyState < video.HAVE_ENOUGH_DATA) return 1;
		return behind > 0 ? 1 + CATCH_UP_RATE : 1 - CATCH_UP_RATE;
	}

	/** The video ran out of data. Repeated stalls switch to patient mode for this video. */
	private _onWaiting = () => {
		if (!this._loadedUrl) return;
		this._buffering = true;
		const now = performance.now();
		this._stalls = this._stalls.filter((t) => now - t < STALL_WINDOW_MS);
		this._stalls.push(now);
		if (this._stalls.length >= STALL_LIMIT && !this._patient) {
			this._patient = true;
			if (this._video) this._video.playbackRate = 1;
		}
	};

	private _onPlaying = () => {
		this._buffering = false;
	};

	/** First data in: size the lead for future jumps from how long this load took. */
	private _onCanPlay = () => {
		this._buffering = false;
		if (this._loadStartedAt > 0) {
			const took = (performance.now() - this._loadStartedAt) / 1000;
			this._joinLead = Math.min(MAX_JOIN_LEAD, Math.max(MIN_JOIN_LEAD, took * 1.2));
			this._loadStartedAt = 0;
		}
	};

	private _ensureVideo(): HTMLVideoElement {
		if (this._video) return this._video;

		const video = document.createElement("video");
		video.crossOrigin = "anonymous";
		video.playsInline = true;
		video.preload = "metadata"; // "auto" once something is playing (see _sync)
		video.muted = true; // the audio manager unmutes after the first user interaction

		// Only "waiting" means the picture stopped; "stalled" fires while there is still data to play.
		video.addEventListener("waiting", this._onWaiting);
		video.addEventListener("playing", this._onPlaying);
		video.addEventListener("canplay", this._onCanPlay);
		// Every seek re-fetches: time it like a fresh load for the next lead.
		video.addEventListener("seeking", () => {
			if (!isBuffered(video, video.currentTime)) {
				this._buffering = true;
				this._loadStartedAt = performance.now();
			}
		});

		video.addEventListener("loadedmetadata", () => {
			this._sinceSync = SYNC_INTERVAL;
			// The arrival ad is this viewer's alone: its length isn't the shared item's.
			if (this._arrivalAd < 0 && Number.isFinite(video.duration)) {
				this.emit(SCREEN_EVENTS.DURATION, {
					index: this._playback.index,
					ad: this.isAd ? this._playback.ad : -1,
					duration: video.duration,
				});
			}
		});
		video.addEventListener("loadeddata", () => {
			this._hasFrame = true;
			this._updateLook();
		});
		video.addEventListener("ended", this._onVideoEnded);
		video.addEventListener("error", () => {
			// hls.js reports its own errors; a cleared src isn't a failure.
			if (!this._loadedUrl || this._hls || !video.getAttribute("src")) return;
			this._failedUrl = this._loadedUrl;
			// A broken ad mustn't keep the viewer from the video.
			if (this._arrivalAd >= 0) this._endArrivalAd();
			console.warn(`[video-screen] Can't play ${this._loadedUrl}: it's missing, or the server doesn't allow cross-origin playback.`);
		});

		this._video = video;
		this._videoTexture = new VideoTexture(video);
		this._videoTexture.colorSpace = SRGBColorSpace;
		this._videoTexture.generateMipmaps = false;

		if (!IS_EDIT_MODE) {
			// Full sound inside the playback box, silent outside it.
			this.container._audioManager.addAudioSource(this, video, () => ({
				audioType: "ambient",
				volume: this._playback.volume,
				muted: this._playback.muted || !this._inArea,
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
		if (this._arrivalAd >= 0) return this._endArrivalAd();

		const { index, loop } = this._playback;
		const ad = this.isAd ? this._playback.ad : -1;
		if (loop === "one" && ad < 0) return;

		this.emit(SCREEN_EVENTS.ENDED, { index, ad });
		if (this._controlled) return;

		// On its own the screen runs the ad → video → next video sequence itself.
		if (ad >= 0) {
			this._setPlayback({ ...this._playback, ad: -1, position: 0, at: Date.now() });
		}
		else if (loop === "all") {
			this._startVideo(this._nextIndex(index));
		}
		else {
			this._setPlayback({ ...this._playback, playing: false, position: this.duration });
		}
	};

	private _unload() {
		if (!this._video || !this._loadedUrl) return;
		this._destroyHls();
		this._video.pause();
		this._video.removeAttribute("src");
		this._video.load();
		this._loadedUrl = null;
		this._hasFrame = false;
		this._buffering = false;
		this._updateLook();
	}

	/** No distance fade: the playback box decides who hears it (muted outside). */
	private _updateAudioType() {
		if (!this._posAudio) return;
		this._posAudio.setAudioType("ambient");
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

		this._destroyHls();
		if (this._areaHelper) {
			this._areaHelper.removeFromParent();
			(this._areaHelper.material as LineBasicMaterial).dispose();
			this._areaHelper = null;
		}

		if (this._video) {
			this._video.removeEventListener("ended", this._onVideoEnded);
			this._video.removeEventListener("waiting", this._onWaiting);
			this._video.removeEventListener("playing", this._onPlaying);
			this._video.removeEventListener("canplay", this._onCanPlay);
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
