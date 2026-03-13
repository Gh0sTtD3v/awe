import { Component3DData } from "../../abstract/component-3d-data";
import { SkyOpts } from "../../../internal/background";

/**
 * @public
 *
 * A tagged union describing which background variant is active.
 * Use the `type` field to select the variant:
 *
 * - **`"color"`** — A solid color background.
 *   - `color` — CSS color string (e.g., `"#000000"`, `"skyblue"`).
 *
 * - **`"sky"`** — A procedural sky based on atmospheric scattering.
 *   - `skyOpts` — Configuration for the sky; see {@link SkyOpts}.
 *
 * - **`"image"`** — A preset or custom background image.
 *   - `imageId` — A preset image ID: `"day"`, `"day2"`, `"orbit"`,
 *     `"orbit2"`, `"space"`, `"moutains"`, `"night"`, `"mud_road"`,
 *     or `"custom"` for a user-provided image.
 *   - `imagePath` *(optional)* — URL or path to a custom image.
 *     Required when `imageId` is `"custom"`.
 *   - `imageFormat` *(optional)* — Image format hint (e.g., `".jpg"`,
 *     `".png"`, `".hdr"`). Auto-detected from URL when omitted.
 *
 * - **`"backdrop"`** — A backdrop-based background.
 *   - `backdropOpts` — Backdrop configuration object.
 */
export type BackgroundOptions =
  | { type: "color"; color: string }
  | { type: "sky"; skyOpts: SkyOpts }
  | { type: "image"; imageId: string; imagePath?: string; imageFormat?: string }
  | { type: "backdrop"; backdropOpts: any };

/**
 * @public
 *
 * Configuration data for {@link BackgroundComponent}.
 *
 * Controls the scene background appearance. It supports four background types: a solid color, a procedural sky, a preset or custom image, or a backdrop.
 * This component is a **singleton** — only one background component can exist per space.
 * It is also a required component that is always present.
 */
export interface BackgroundComponentData extends Component3DData {
  /**
   * @internal
   */
  kit?: "cyber";

  /** Must be `"background"`. */
  type: "background";

  /**
   * Optional unique identifier for the component. If not provided,
   * an auto-generated id will be assigned.
   */
  id?: string;

  /**
   * Background configuration. The `type` field inside `options` selects
   * which variant is active: `"color"`, `"sky"`, `"image"`, or `"backdrop"`.
   *
   * Defaults to `{ type: "color", color: "#000000" }` when created
   * through the factory without explicit options.
   *
   * See {@link BackgroundOptions} for the full specification of each variant.
   */
  options: BackgroundOptions;
}
