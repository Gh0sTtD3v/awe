import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Available font families for the {@link TextComponent}.
 *
 * - `"aeonik-bold"` — Aeonik Bold, a modern sans-serif typeface with bold weight.
 * - `"aeonik-medium"` — Aeonik Medium, a modern sans-serif typeface with medium weight.
 * - `"playfair-regular"` — Playfair Regular, a serif typeface with regular weight.
 * - `"playfair-italic"` — Playfair Italic, a serif typeface with italic style.
 */
export type FontFamily =
  | "aeonik-bold"
  | "aeonik-medium"
  | "playfair-regular"
  | "playfair-italic";

/**
 * @public
 *
 * Horizontal text alignment options for the {@link TextComponent}.
 *
 * - `"left"` — Aligns text to the left edge of the text box.
 * - `"center"` — Centers text within the text box.
 * - `"right"` — Aligns text to the right edge of the text box.
 */
export type TextAlignment = "left" | "center" | "right";

/**
 * @public
 *
 * Text transformation options for the {@link TextComponent}.
 *
 * - `"none"` — No transformation; text is displayed as-is.
 * - `"uppercase"` — Converts all characters to upper case.
 * - `"lowercase"` — Converts all characters to lower case.
 * - `"capitalize"` — Capitalizes the first letter of each word.
 * - `"togglecase"` — Inverts the case of each character.
 */
export type TextTransform =
  | "none"
  | "uppercase"
  | "lowercase"
  | "capitalize"
  | "togglecase";

/**
 * @public
 *
 * Configuration data for {@link TextComponent}.
 *
 * Configures a 2D text element rendered in 3D space. Supports multiple font
 * families, horizontal alignment, text transforms, color, opacity, and optional
 * GPU instanced rendering for efficiently displaying many copies of the same text.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface TextComponentData extends Component3DData {
  /**
   * @internal
   */
  kit?: "cyber";

  /**
   * The component type discriminator. Must be `"text"`.
   */
  type: "text";

  /**
   * if not provided, an auto id will be generated
   */
  id?: string;

  /**
   * name for the component. Defaults to ""
   */
  name?: string;

  /**
   * Position of the component in the space. Defaults to {x: 0, y: 0, z: 0}
   */
  position?: XYZ;

  /**
   * Rotation of the component in the space, in radians. Defaults to {x: 0, y: 0, z: 0}
   */
  rotation?: XYZ;

  /**
   * Scale of the component in the space. Defaults to {x: 1, y: 1, z: 1}
   */
  scale?: XYZ;

  /**
   * The text string to display. This is the main content rendered by the component.
   */
  text: string;

  /**
   * Font family to use for rendering the text.
   * See {@link FontFamily} for available options.
   * Defaults to `"aeonik-bold"`.
   */
  font?: FontFamily;

  /**
   * Width of the text box in layout units. Controls when long text wraps
   * to multiple lines. Valid range: `100` to `2000`.
   * Defaults to `500`.
   */
  width?: number;

  /**
   * Line height of the text in layout units. Controls vertical spacing
   * between lines of text. Defaults to `60`.
   */
  lineHeight?: number;

  /**
   * Color of the text as a CSS color string (e.g., `"#ffffff"`, `"red"`,
   * `"rgb(255, 0, 0)"`). Defaults to `"#ffffff"` (white).
   */
  textColor?: string;

  /**
   * Horizontal alignment of the text within the text box.
   * See {@link TextAlignment} for available options.
   * Defaults to `"left"`.
   */
  align?: TextAlignment;

  /**
   * Optional text casing transform to apply before rendering.
   * See {@link TextTransform} for available options.
   * Defaults to `"none"`.
   */
  textTransform?: TextTransform;

  /**
   * Opacity of the text, from `0` (fully transparent) to `1` (fully opaque).
   * Defaults to `1`.
   */
  opacity?: number;

  /**
   * Whether to use GPU instanced mesh rendering. Enable this when you need
   * to display many copies of the same text efficiently.
   * Defaults to `false`.
   */
  instanced?: boolean;

  /**
   * Whether instanced text should use billboarding, making it always
   * face the camera. Only relevant when {@link instanced} is `true`.
   * Defaults to `true`.
   */
  instancedBillBoard?: boolean;
}
