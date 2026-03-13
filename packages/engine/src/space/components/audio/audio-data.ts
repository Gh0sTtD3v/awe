import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for the {@link AudioComponent}. Defines an audio source that can be
 * placed in the 3D game world with support for ambient or spatial playback modes.
 *
 * - **Ambient mode** (`audioType: "ambient"`): Audio plays at constant volume regardless of
 *   the listener's position. Ideal for background music or global sound effects.
 * - **Spatial mode** (`audioType: "spatial"`): Audio volume attenuates with distance from
 *   the source. The audible radius is controlled by {@link audioRange}. Ideal for
 *   environment sounds like waterfalls, campfires, or machinery.
 *
 * See {@link ComponentManager.create} for how to create a component using this data.
 */
export interface AudioComponentData extends Component3DData {
    /**
     * Type of the component
     */
    type: "audio";

    /**
     * if not provided, an auto id will be generated
     */
    id?: string;

    /**
     * name for the component. Defaults to ""
     */
    name?: string;

    /**
     * URL of the audio file to play. Supports common audio formats such as `.mp3`, `.ogg`, and `.wav`.
     */
    url: string;

    /**
     * @internal
     */
    mime_type?: string;

    /**
     * Position of the audio in the space. Defaults to {x: 0, y: 0, z: 0}
     */
    position?: XYZ;

    /**
     * Rotation of the audio in the space. Defaults to {x: 0, y: 0, z: 0}
     */
    rotation?: XYZ;

    /**
     * Scale of the audio in the space. Defaults to {x: 1, y: 1, z: 1}
     */
    scale?: XYZ;

    /**
     * Volume of the audio as a normalized value from 0 (silent) to 1 (full volume).
     * Defaults to 1.
     */
    volume?: number;

    /**
     * @deprecated Use {@link audioType} set to `"ambient"` instead.
     *
     * Whether the audio is used to play background music. Defaults to false.
     */
    ambient?: boolean;

    /**
     * Type of the audio playback mode. Defaults to `"ambient"`.
     *
     * - `"ambient"`: Volume stays constant regardless of listener position; used for background music or global effects.
     * - `"spatial"`: Volume attenuates with distance from the source within the radius defined by {@link audioRange}.
     *
     * When set to `"spatial"`, configure {@link audioRange} to control the audible radius.
     */
    audioType?: "ambient" | "spatial";

    /**
     * The radius (in world units) within which spatial audio is audible.
     * Only used when {@link audioType} is `"spatial"`. Audio volume decreases
     * with distance from the source and becomes silent outside this range.
     *
     * Valid range: 1 to 40. Defaults to 3.
     */
    audioRange?: number;

    /**
     * Whether the audio should start playing automatically when the component is initialized.
     * Playback may be deferred until the user has interacted with the page due to browser
     * autoplay policies. Defaults to false.
     */
    autoPlay: false;

    /**
     * Whether the audio should loop back to the beginning when it reaches the end.
     * Defaults to false.
     */
    loop: false;

    /**
     * Audio playback rate. A value of 1 is normal speed, 0.5 is half speed, and 2 is double speed.
     *
     * Valid range: 0.5 to 2. Defaults to 1.
     */
    playbackRate?: number;
}
