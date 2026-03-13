import BackgroundFactory, {
  BackgroundMesh,
  BackgroundOpts,
  SkyOpts,
} from "../../../internal/background";
import {
  Component3D,
  DataChangeOpts,
} from "../../abstract/component-3d";
import { BackgroundComponentData } from "./background-data";
export type { BackgroundComponentData } from "./background-data";
export type { BackgroundOptions } from "./background-data";
import { presetImages } from "./data";

import { DisposePipelinesMeshes } from "../../../internal/utils/dispose";
import { Assets } from "../../../internal/resources/assets";
/**
 * @public
 *
 * The background component controls the scene background appearance. It supports
 * four background types: a solid color, a procedural sky, a preset or custom image,
 * or a backdrop.
 *
 * This component is a **singleton** — only one background component can exist per space.
 * It is also a required component that is always present.
 *
 * Changing the background automatically triggers an update on the {@link FogComponent}
 * if one is present in the same space, so fog visuals stay consistent with the sky.
 *
 * At runtime the background type can be switched programmatically via
 * {@link BackgroundComponent.setAsColor}, {@link BackgroundComponent.setAsSky}, or
 * {@link BackgroundComponent.setAsImage}.
 *
 * @example
 * ```ts
 * // Set a solid-color background
 * const bg = await space.components.create({
 *   type: "background",
 *   options: { type: "color", color: "#1a1a2e" },
 * });
 * ```
 *
 * @example
 * ```ts
 * // Set a procedural sky background
 * const bg = await space.components.create({
 *   type: "background",
 *   options: {
 *     type: "sky",
 *     skyOpts: {
 *       turbidity: 4,
 *       rayleigh: 3,
 *       mieCoefficient: 0.005,
 *       mieDirectionalG: 0.07,
 *       azimuth: 180,
 *       elevation: 2,
 *     },
 *   },
 * });
 * ```
 *
 * @example
 * ```ts
 * // Set a preset image background
 * const bg = await space.components.create({
 *   type: "background",
 *   options: { type: "image", imageId: "space" },
 * });
 *
 * // Later, switch to a different background at runtime
 * bg.setAsColor("#000000");
 * ```
 */
export class BackgroundComponent extends Component3D<BackgroundComponentData> {
  //

  /**
   * @internal
   */
  _background: BackgroundMesh;

  /**
   * @internal
   */
  async init() {
    this.matrixAutoUpdate = false;

    this.matrixWorldAutoUpdate = false;
    //
    const params = this.#getBackgroundOptsFromData(this.data);

    await this.load(params);
    this.#syncFogBackground();
  }

  #frameId = 0;

  /**
   * @internal
   */
  async load(params: BackgroundOpts) {
    // this._background = this.space.background = null;

    let prevBackground = this._background;

    let frameId = ++this.#frameId;

    const background = await BackgroundFactory.get(params);

    if (frameId !== this.#frameId) return;

    this._background = background;

    if (prevBackground) {
      //
      this.space.remove(prevBackground);

      prevBackground.dispose?.();
    }

    if (this._background != null) {
      this.space.add(this._background);
    }
  }

  #getBackgroundOptsFromData(data: BackgroundComponentData): BackgroundOpts {
    const opts = data.options;

    switch (opts.type) {
      case "color":
        return { type: "color", color: opts.color };

      case "sky":
        return { type: "sky", options: structuredClone(opts.skyOpts) };

      case "image": {
        const path =
          Assets.background[opts.imageId] ??
          opts.imagePath ??
          presetImages.day2.path;

        const format =
          opts.imageFormat ?? presetImages[opts.imageId]?.format ?? ".jpg";

        return {
          type: "image",
          options: { image: path, path, format },
        };
      }

      case "backdrop":
        return { type: "backdrop", options: opts.backdropOpts };
    }
  }

  /**
   * @internal
   */
  async update(opts: BackgroundOpts) {
    if (
      this._background.backgroundType == opts.type &&
      this._background.updateOpts
    ) {
      this._background.updateOpts(opts);
    } else {
      await this.load(opts);
    }

    this.#syncFogBackground();
  }

  #syncFogBackground() {
    const fog = this.container.byType("fog")?.[0];

    // @ts-ignore
    fog?._update3D();
  }

  /**
   * @internal
   */
  onDataChange(opts: DataChangeOpts): void {
    //
    const params = this.#getBackgroundOptsFromData(this.data);

    let update =
      !opts.isProgress ||
      (params.type == this._background.backgroundType &&
        (params.type === "color" || params.type === "sky"));

    if (update) {
      this.update(params);
    }
  }

  /**
   * @internal
   */
  dispose() {
    this.#frameId = -1;

    DisposePipelinesMeshes(this._background);

    let raw = this._background?.getRaw() as any;

    if (raw) {
      // console.log("disposing raw target");
      if (raw.renderTarget?.dispose) {
        raw.renderTarget?.dispose();
      } else if (raw?.sharp?.dispose) {
        raw?.sharp?.dispose();
      } else if (raw?.dispose) {
        raw?.dispose();
      }
    }

    (this._background as any)?.dispose?.();

    this._background = null;
  }

  /**
   * Sets the background to a solid color.
   *
   * @param color - A CSS color string (e.g., `"#ff0000"`, `"blue"`, `"rgb(0,0,0)"`).
   */
  setAsColor(color: string) {
    this.update({ type: "color", color });
  }

  /**
   * Sets the background to a procedural sky generated from atmospheric
   * scattering parameters.
   *
   * @param options - Sky configuration controlling sun position and
   *   atmospheric scattering. See {@link SkyOpts} for available properties
   *   and their defaults.
   */
  setAsSky(options: SkyOpts) {
    this.update({ type: "sky", options });
  }

  /**
   * Sets the background to an image — either one of the built-in presets
   * or a custom image URL.
   *
   * Available preset IDs: `"day"`, `"day2"`, `"orbit"`, `"orbit2"`,
   * `"space"`, `"moutains"`, `"night"`, `"mud_road"`.
   *
   * @param image - A preset image ID (e.g., `"space"`) or a URL/path
   *   to a custom image file.
   * @param format - Optional image format hint. Supported values:
   *   `".jpg"`, `".jpeg"`, `".png"`, `".hdr"`. When omitted the format
   *   is auto-detected from the image URL extension, falling back to
   *   `".jpg"` if detection fails.
   */
  setAsImage(image: string, format?: ".jpg" | ".jpeg" | ".png" | ".hdr") {
    image = presetImages[image]?.path || image;

    if (!format) {
      const ext = "." + image.split(".").pop();
      if (allowedFormats.includes(ext)) {
        format = ext as ".jpg" | ".jpeg" | ".png" | ".hdr";
      }
    }

    format = format || ".jpg";

    this.update({ type: "image", options: { image, format, path: image } });
  }

  // setAsBackdrop(options: any) {
  //     this.update({ type: "backdrop", options });
  // }
}

const allowedFormats = [".jpg", ".jpeg", ".png", ".hdr"];
