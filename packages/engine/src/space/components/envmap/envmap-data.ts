import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Tagged union describing how the environment map is sourced. Two modes are available:
 *
 * - **`"scene"`** — Captures a cubemap from the live 3D scene. An optional
 *   `position` can be specified to control the capture origin; if omitted the
 *   cubemap is captured from the scene origin `{x: 0, y: 0, z: 0}`.
 *
 * - **`"image"`** — Loads a pre-made image as the environment map. Use one of the
 *   built-in preset identifiers (`"studio"`, `"fields"`, `"vig"`) via `imageId`, or
 *   set `imageId` to `"custom"` and provide `imagePath` / `imageFormat` to load a
 *   user-supplied image.
 */
export type EnvmapOptions =
  | {
      /** Capture an environment cubemap from the live 3D scene. */
      type: "scene";
      /**
       * World-space position from which the scene cubemap is captured.
       *
       * @defaultValue `{ x: 0, y: 0, z: 0 }` (scene origin)
       */
      position?: XYZ;
    }
  | {
      /** Use a preset or custom image as the environment map. */
      type: "image";
      /**
       * Identifier of the environment map image to use.
       *
       * Built-in presets: `"studio"`, `"fields"`, `"vig"` (village).
       * Set to `"custom"` to supply your own image via {@link imagePath}.
       */
      imageId: string;
      /**
       * URL or asset path of a custom environment map image.
       * Only used when `imageId` is `"custom"`.
       */
      imagePath?: string;
      /**
       * File format of the custom image (e.g. `".hdr"`, `".png"`, `".jpg"`).
       * Only used when `imageId` is `"custom"`.
       */
      imageFormat?: string;
    };

/**
 * @public
 *
 * Configuration data for the {@link EnvmapComponent}.
 *
 * Defines how the scene's environment map is sourced — either captured from the
 * live 3D scene or loaded from a preset / custom image. The environment map
 * controls reflections and image-based lighting on all PBR materials in the space.
 */
export interface EnvmapComponentData extends Component3DData {
  /**
   * Component type discriminator. Must be `"envmap"`.
   */
  type: "envmap";

  /**
   * Optional unique identifier for this component instance.
   * If not provided, an auto-generated id will be assigned.
   */
  id?: string;

  /**
   * Display name for this component. Defaults to `""`.
   */
  name?: string;

  /**
   * Configuration for how the environment map is sourced.
   *
   * Use `{ type: "scene" }` to capture a cubemap from the live 3D scene,
   * or `{ type: "image", imageId: "studio" }` to load a preset image.
   *
   * See {@link EnvmapOptions} for the full set of options.
   */
  options: EnvmapOptions;
}
