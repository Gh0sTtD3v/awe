import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * What happens when a video on a {@link VideoScreenComponent} ends:
 * - `off`: stop.
 * - `one`: repeat the same video.
 * - `all`: play the next video, wrapping around to the first.
 */
export type VideoScreenLoop = "off" | "one" | "all";

/** @public A screen's playback box, in metres, in the screen's frame (front is +Z). */
export interface VideoScreenPlayArea {
	/** Width, height and depth. */
	size: XYZ;
	/** Centre of the box relative to the screen's centre. */
	offset: XYZ;
}

/** @public A room-sized box in front of the screen. */
export const DEFAULT_PLAY_AREA: VideoScreenPlayArea = {
	size: { x: 12, y: 6, z: 12 },
	offset: { x: 0, y: 0, z: 6 },
};

/** @public One entry of a screen's playlist. */
export interface VideoScreenItem {
	/** Shown in the controls. Defaults to the file name. */
	title?: string;
	/** URL of the video file (e.g. .mp4, .webm). */
	url: string;
}

/**
 * @public
 *
 * What a screen is playing. Every viewer applies the same playback, so a
 * multiplayer game keeps screens in step by sharing it; see
 * {@link VideoScreenComponent.applyPlayback}.
 */
export interface VideoScreenPlayback {
	/** Playlist index, or -1 when nothing is loaded. While an ad plays, the video that follows it. */
	index: number;
	/** Index into `ads` of the ad playing before the video, or -1. */
	ad?: number;
	playing: boolean;
	/** Playback position in seconds at time `at`. */
	position: number;
	/** `Date.now()` on this client when `position` was true. */
	at: number;
	/** 0 to 1. */
	volume: number;
	muted: boolean;
	loop: VideoScreenLoop;
}

/**
 * @public
 *
 * Configuration data for {@link VideoScreenComponent}.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface VideoScreenComponentData extends Component3DData {
	type: "video-screen";

	id?: string;

	name?: string;

	position?: XYZ;

	rotation?: XYZ;

	/** Width and height of the screen; videos are letterboxed to fit. */
	scale?: XYZ;

	/** Name of the screen in the controls. */
	label?: string;

	/** The videos this screen can play, in order. */
	playlist?: VideoScreenItem[];

	/** Ads; when there are any, one plays (in turn) before every video. */
	ads?: VideoScreenItem[];

	/**
	 * Who may control this screen, besides players with Control Screens:
	 * the id of a token gate whose holders may (e.g. the apartment it hangs
	 * in), or `"everyone"`. Empty: only players with Control Screens.
	 * Enforced by the game server.
	 */
	controlGate?: string;

	/** Start the first video as soon as the world opens. Defaults to `false`. */
	autoPlay?: boolean;

	/** Defaults to `"all"`. */
	loop?: VideoScreenLoop;

	/** Starting volume, 0 to 1. Defaults to `0.75`. */
	volume?: number;

	/**
	 * The playback box. Inside it the video loads and plays with full sound,
	 * and the controls are available; outside it nothing is downloaded and
	 * nothing is heard. In the screen's own frame (front is +Z), in metres,
	 * unaffected by the screen's scale. Defaults to {@link DEFAULT_PLAY_AREA}.
	 */
	playArea?: VideoScreenPlayArea;

	/** @deprecated Ignored: sound follows the playback box. */
	audioType?: "spatial" | "ambient";

	/** @deprecated Ignored: sound follows the playback box. */
	audioRange?: number;

	/** @deprecated Ignored: replaced by the playback box. */
	loadDistance?: number;

	/** @deprecated Ignored: replaced by the playback box. */
	controlDistance?: number;

	/** Colour around letterboxed video and while idle. Defaults to `"#000000"`. */
	backgroundColor?: string;

	/** Image shown while nothing is playing. */
	idleImage?: string;
}
