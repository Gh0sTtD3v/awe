import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ, PluginData } from "../types";
import { RenderMode } from "../../../@types/types";

/**
 * @public
 *
 * Configuration data for {@link AvatarComponent}. Defines all properties needed to display
 * and configure a VRM avatar in the scene, including its model URL, animation, render mode,
 * opacity, optional overlays (text/picture), and built-in visual plugins.
 *
 * See {@link ComponentManager.create} on how to create a component using this data.
 */
export interface AvatarComponentData extends Component3DData {
    /**
     * @internal
     */
    kit?: "cyber";

    /**
     * The component type discriminator. Must be `"avatar"`.
     */
    type: "avatar";

    /**
     * if not provided, an auto id will be generated
     */
    id?: string;

    /**
     * name for the component. Defaults to ""
     */
    name?: string;

    /**
     * URL of the VRM (.vrm or .glb) avatar file to load and display.
     * Defaults to the built-in "sunshine" avatar preset.
     */
    url: string;

    /**
     * Optional URL of a compressed/optimized version of the VRM file.
     * When provided, the engine automatically uses this URL on platforms
     * that support compressed assets, falling back to {@link url} otherwise.
     */
    urlCompressed?: string;

    /**
     * Position of the component in the space. Defaults to {x: 0, y: 0, z: 0}
     */
    position?: XYZ;

    /**
     * Rotation of the component in the space. Defaults to {x: 0, y: 0, z: 0}
     */
    rotation?: XYZ;

    /**
     * Scale of the component in the space. Defaults to {x: 1, y: 1, z: 1}
     */
    scale?: XYZ;

    /**
     * @internal
     */
    awaitAvatarLoading?: boolean;

    /**
     * @internal
     */
    awaitPictureLoading?: boolean;

    /**
     * @internal
     */
    awaitLoaderThrottle?: number;

    /**
     * URL of a picture to display floating above the avatar. Defaults to `""` (no picture).
     */
    picture?: string;

    /**
     * text to display on top the avatar. Defaults to "".
     */
    text?: string;

    /**
     * URL of a thumbnail or preview image representing this avatar.
     * Used for UI display purposes (e.g., avatar selection screens).
     */
    image?: string;

    /**
     * @internal
     */
    nameDisplayWithPicture?: true;

    /**
     * Name of the animation to play on the avatar when it loads.
     * Must match a registered VRM animation name (e.g. `"IDLE"`, `"walk"`, `"run"`).
     * Defaults to `"IDLE"`.
     */
    animation?: string;

    /**
     * Visual render mode for the avatar model.
     * Allowed values: `"default"`, `"toon"`, `"glitch"`, `"ghost"`, `"error"`.
     * Defaults to `"default"`.
     */
    renderMode?: RenderMode;

    /**
     * When `true`, uses CPU-based AnimationMixer for animation playback, which enables
     * bone access via {@link AvatarComponent.getBone}, mixer update callbacks via
     * {@link AvatarComponent.onMixerUpdate}, and programmatic animation control via
     * {@link AvatarComponent.play} / {@link AvatarComponent.stop}.
     *
     * When `false` (default), uses GPU-based animation for better performance,
     * but bone access and mixer callbacks are unavailable.
     *
     * Defaults to `false`.
     */
    useCpuAnimation?: boolean;

    /**
     * Opacity of the avatar. Range: `0` (fully transparent) to `1` (fully opaque).
     * Defaults to `1`.
     */
    opacity: number;

    /**
     * When `true`, the avatar always renders at full detail regardless of camera distance,
     * bypassing LOD (Level of Detail) optimization. Defaults to `false`.
     */
    ignoreLOD?: boolean;

    /**
     * @internal
     */
    main?: boolean;

    /**
     * Optional list of built-in visual plugins to apply to this avatar (e.g. rainbow effect, damage flash).
     * Each entry references a plugin by its string ID with optional configuration.
     */
    plugins?: PluginData[];
}
