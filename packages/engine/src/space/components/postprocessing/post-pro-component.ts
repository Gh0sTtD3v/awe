// @ts-check

import {
  Component3D,
  DataChangeOpts,
} from "../../abstract/component-3d";
import { LUTMAPS, POST_TYPES } from "./data";
import postprocessing from "../../../internal/rendering/postprocessing";
import { Assets } from "../../../internal/resources/assets";
import { PostProcessingComponentData } from "./post-pro-data";

import {
  IS_EDIT_MODE,
  SET_SHADOW_NEEDS_UPDATE,
} from "../../../internal/constants";

export type { PostProcessingComponentData } from "./post-pro-data";

/**
 * Applies full-screen post-processing visual effects (filters) to the entire rendered scene.
 * The active effect is selected via the {@link PostProcessingComponentData.postProType | postProType}
 * property in the component data.
 *
 * Available effects:
 * - **Bloom** — Adds a soft glow around bright areas of the scene.
 * - **LookUpTable** — Applies color grading using a LUT texture for cinematic or stylized color tones.
 * - **Trippy** — Applies a psychedelic color and distortion animation.
 * - **TV** — Simulates a retro CRT television with static, glitch artifacts, and vignetting.
 *
 * This is a singleton component — only one post-processing effect can exist per space.
 *
 * Use the {@link PostProcessingComponent.enable | enable()} and {@link PostProcessingComponent.disable | disable()}
 * methods to toggle the effect at runtime.
 *
 * @example
 * // Apply a bloom effect with default settings
 * const postpro = await space.components.create({
 *     type: "postprocessing",
 *     enabled: true,
 *     postProType: "Bloom",
 *     bloomOpts: {
 *         threshold: 0.75,
 *         smoothing: 0.29,
 *         intensity: 0.6,
 *         radius: 0.7,
 *         color: "#ffffff"
 *     }
 * });
 *
 * @example
 * // Apply LUT color grading with the "sunset" preset
 * const postpro = await space.components.create({
 *     type: "postprocessing",
 *     enabled: true,
 *     postProType: "LookUpTable",
 *     lutOpts: {
 *         image: {
 *             id: "sunset",
 *             name: "sunset",
 *             image: "",
 *             path: ""
 *         }
 *     }
 * });
 *
 * @example
 * // Apply a TV glitch effect
 * const postpro = await space.components.create({
 *     type: "postprocessing",
 *     enabled: true,
 *     postProType: "TV",
 *     tvOpts: {
 *         amount: 1.0,
 *         strength: 0.8,
 *         glitchRatio: 0.5,
 *         speed: 1.0,
 *         vignetteFallOff: 0.3,
 *         vignetteStrength: 0.8
 *     }
 * });
 *
 * @example
 * // Toggle post-processing at runtime
 * const postpro = space.components.byType("postprocessing")[0];
 * postpro.setData({ enabled: true });
 * // later...
 * postpro.setData({ enabled: false });
 *
 * @public
 */
export class PostProcessingComponent extends Component3D<PostProcessingComponentData> {
  //
  /** @internal */
  protected async init() {
    this.matrixAutoUpdate = false;

    this.matrixWorldAutoUpdate = false;

    this._update3D();
  }

  private _update3D() {
    const opts = postprocessing.options;

    opts.enabled = this.data.enabled;
    opts.type = this.data.postProType;

    if (this.data.postProType === POST_TYPES.BLOOM) {
      opts.value = {
        color: this.data.bloomOpts.color,
        intensity: this.data.bloomOpts.intensity,
        radius: this.data.bloomOpts.radius,
        smoothing: this.data.bloomOpts.smoothing,
        threshold: this.data.bloomOpts.threshold,
      };
    } else if (this.data.postProType === POST_TYPES.LOOK_UP_TABLE) {
      //console.log("opts, data", opts, data);
      opts.value = {
        image: {
          ...this.data.lutOpts.image,
          path:
            this.data.customUpload?.path ||
            this.data.lutOpts?.image?.path ||
            this.data.lutOpts?.image?.url ||
            Assets.lutmaps[this.data.lutOpts?.image?.id] ||
            LUTMAPS.hudson.path,
        },
      };
      //
      console.log("lutmap", opts.value.image.path);
    } else if (this.data.postProType === POST_TYPES.TRIPPY) {
      opts.value = {
        speed: this.data.trippyOpts.speed,
      };
    } else if (this.data.postProType === POST_TYPES.TV) {
      opts.value = {
        amount: this.data.tvOpts.amount,
        glitchRatio: this.data.tvOpts.glitchRatio,
        speed: this.data.tvOpts.speed,
        strength: this.data.tvOpts.strength,
        vignetteFallOff: this.data.tvOpts.vignetteFallOff,
        vignetteStrength: this.data.tvOpts.vignetteStrength,
      };
    } else if (this.data.postProType === "custom") {
      const kernel = this.data.customOpts.kernel;
      opts.value = structuredClone(this.data.customOpts);
      opts.value.kernel = kernel;
    }
  }

  /**
   * @internal
   */
  onDataChange(opts: DataChangeOpts): void {
    this._update3D();

    if (this.data.enabled != opts.prev?.enabled) {
      if (IS_EDIT_MODE) {
        SET_SHADOW_NEEDS_UPDATE(true);
      }
    }
  }

  /** @internal */
  protected dispose() {
    postprocessing.options.enabled = false;
  }
}
