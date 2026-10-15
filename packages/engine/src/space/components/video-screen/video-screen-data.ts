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
	/** Playlist index, or -1 when nothing is loaded. */
	index: number;
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

	/** Start the first video as soon as the world opens. Defaults to `false`. */
	autoPlay?: boolean;

	/** Defaults to `"all"`. */
	loop?: VideoScreenLoop;

	/** Starting volume, 0 to 1. Defaults to `0.75`. */
	volume?: number;

	/** `spatial` fades with distance; `ambient` is heard everywhere. Defaults to `"spatial"`. */
	audioType?: "spatial" | "ambient";

	/** Hearing range for spatial audio. Defaults to `15`. */
	audioRange?: number;

	/** Videos only load within this distance of the camera. Defaults to `40`. */
	loadDistance?: number;

	/** Players this close can open the screen's controls. Defaults to `8`. */
	controlDistance?: number;

	/** Colour around letterboxed video and while idle. Defaults to `"#000000"`. */
	backgroundColor?: string;

	/** Image shown while nothing is playing. */
	idleImage?: string;
}
