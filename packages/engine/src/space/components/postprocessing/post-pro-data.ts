import { Component3DData } from "../../abstract/component-3d-data";

/**
 * @public
 *
 * Data specification for {@link PostProcessingComponent}. Configures full-screen post-processing
 * visual effects (filters) applied to the entire rendered scene.
 *
 * This is a singleton component — only one post-processing configuration can exist per space.
 *
 * The {@link PostProcessingComponentData.postProType | postProType} property selects which effect
 * is active. Only the options object corresponding to the active effect type is used:
 * - `"Bloom"` — uses {@link PostProcessingComponentData.bloomOpts | bloomOpts}
 * - `"LookUpTable"` — uses {@link PostProcessingComponentData.lutOpts | lutOpts}
 * - `"TV"` — uses {@link PostProcessingComponentData.tvOpts | tvOpts}
 * - `"Trippy"` — uses {@link PostProcessingComponentData.trippyOpts | trippyOpts}
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface PostProcessingComponentData extends Component3DData {
    /**
     * The component type identifier. Must be `"postprocessing"`.
     */
    type: "postprocessing";

    /**
     * Optional identifier for the component. If not provided, an auto-generated id will be assigned.
     */
    id?: string;

    /**
     * Display name for the component. Defaults to `""`.
     */
    name?: string;

    /**
     * Whether the post-processing effect is active. When `false`, no effect is rendered.
     * Defaults to `true`.
     */
    enabled?: boolean;

    /**
     * Selects which post-processing effect to apply. Only the corresponding options object
     * (e.g. `bloomOpts` for `"Bloom"`) is used.
     *
     * Allowed values:
     * - `"Bloom"` — Adds a glow/bloom around bright areas of the scene.
     * - `"LookUpTable"` — Applies color grading using a LUT texture.
     * - `"Trippy"` — Applies a psychedelic distortion effect.
     * - `"TV"` — Applies a retro television glitch/static effect.
     *
     * Defaults to `"Bloom"`.
     */
    postProType?: string;

    /**
     * Options for the Bloom effect. Only used when {@link PostProcessingComponentData.postProType | postProType}
     * is `"Bloom"`.
     *
     * Bloom adds a soft glow around bright areas of the scene.
     */
    bloomOpts?: {
        /**
         * Brightness threshold for the bloom effect. Pixels brighter than this value
         * will glow. Range: 0–1. Defaults to `0.75`.
         */
        threshold?: number;
        /**
         * Smoothing factor for the bloom transition between glowing and non-glowing areas.
         * Range: 0–1. Defaults to `0.29`.
         */
        smoothing?: number;
        /**
         * Overall intensity (brightness) of the bloom glow. Range: 0–1. Defaults to `0.6`.
         */
        intensity?: number;
        /**
         * Radius (spread) of the bloom glow. Higher values produce a wider glow.
         * Range: 0–1. Defaults to `0.7`.
         */
        radius?: number;
        /**
         * Tint color for the bloom glow, as a CSS hex color string (e.g. `"#ffffff"`).
         * Defaults to `"#ffffff"` (white / no tint).
         */
        color?: string;
    };

    /**
     * Options for the LookUpTable (LUT) color grading effect. Only used when
     * {@link PostProcessingComponentData.postProType | postProType} is `"LookUpTable"`.
     *
     * LUT color grading remaps scene colors using a lookup texture to achieve
     * cinematic or stylized color tones.
     */
    lutOpts?: {
        /**
         * The LUT image preset or custom LUT configuration.
         *
         * Built-in presets available by id:
         * - `"hudson"` — A cool-toned color grade.
         * - `"kodak"` — A warm, film-like color grade.
         * - `"sunset"` — A warm orange/pink color grade.
         * - `"custom"` — Use a custom uploaded LUT texture (provide your own `path`).
         */
        image?: {
            /**
             * Identifier for the LUT preset. Use `"hudson"`, `"kodak"`, `"sunset"` for
             * built-in presets, or `"custom"` for a custom uploaded LUT texture.
             */
            id: string;
            /**
             * Display name of the LUT preset.
             */
            name: string;
            /**
             * URL or path to a preview thumbnail image of the LUT preset.
             */
            image: string;
            /**
             * URL or path to the actual LUT texture file used for color grading.
             */
            path: string;
            /**
             * Optional alternative URL for the LUT texture. Used as a fallback if `path`
             * is not available.
             */
            url?: string;
        };
    };

    /**
     * Options for the TV (television glitch) effect. Only used when
     * {@link PostProcessingComponentData.postProType | postProType} is `"TV"`.
     *
     * Simulates a retro CRT television with static, glitch artifacts, and vignetting.
     */
    tvOpts?: {
        /**
         * Overall amount/opacity of the TV effect. Range: 0–1. Defaults to `1.0`.
         */
        amount?: number;
        /**
         * Strength of the TV distortion. Range: 0–1. Defaults to `1.0`.
         */
        strength?: number;
        /**
         * Frequency of glitch artifacts. Higher values produce more frequent glitches.
         * Range: 0–1. Defaults to `0.2`.
         */
        glitchRatio?: number;
        /**
         * Animation speed of the TV static and glitch effects. Range: 0–1. Defaults to `1.0`.
         */
        speed?: number;
        /**
         * Controls how quickly the vignette fades from the edges. Range: 0–1. Defaults to `0`.
         */
        vignetteFallOff?: number;
        /**
         * Intensity of the vignette darkness at the edges. Range: 0–1. Defaults to `1`.
         */
        vignetteStrength?: number;
    };

    /**
     * Options for the Trippy effect. Only used when
     * {@link PostProcessingComponentData.postProType | postProType} is `"Trippy"`.
     *
     * Applies a psychedelic color and distortion animation to the scene.
     */
    trippyOpts?: {
        /**
         * Animation speed of the trippy distortion effect. Range: 0–1. Defaults to `0.1`.
         */
        speed?: number;
    };

    /**
     * @internal
     */
    customOpts?: Record<string, any>;

    /**
     * @internal
     */
    customUpload?: {
        path?: string;
    };
}
