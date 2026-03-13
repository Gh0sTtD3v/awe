import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

import { atlasInputs } from "./constants";
/**
 * @public
 *
 * Configuration data for {@link InteractionComponent}. Defines a proximity-triggered interactive
 * prompt that displays an icon (e.g., a keyboard key or mouse button hint) in 3D space. The prompt
 * becomes visible when the player is within a configurable distance, and fires interaction events
 * when the player presses the configured key.
 */
export interface InteractionComponentData extends Component3DData {
  /**
   * @internal
   */
  kit?: "cyber";

  /**
   * The component type identifier. Must be `"interaction"`.
   */
  type: "interaction";

  /**
   * Optional unique identifier for this component. If not provided, an auto-generated
   * id will be assigned.
   */
  id?: string;

  /**
   * Display name for the component. Defaults to `""`.
   */
  name?: string;

  /**
   * Position of the component in the space. Defaults to `{x: 0, y: 0, z: 0}`.
   */
  position?: XYZ;

  /**
   * Rotation of the component in the space. Defaults to `{x: 0, y: 0, z: 0}`.
   * Only applied when {@link billboard} is `false`; otherwise rotation is ignored
   * because the prompt always faces the camera.
   */
  rotation?: XYZ;

  /**
   * Scale of the component in the space. Defaults to `{x: 0.5, y: 0.5, z: 0.5}`.
   */
  scale?: XYZ;

  /**
   * The maximum distance (in world units) from the {@link distanceTarget} at which the
   * interaction prompt becomes visible and responsive to player input. Defaults to `10`.
   */
  distance?: number;

  /**
   * A 3D position used as the reference point for distance-based activation. The interaction
   * prompt becomes visible when the player is within {@link distance} units of this point.
   * When `null`, defaults to the component's own position. Defaults to `null`.
   */
  distanceTarget?: XYZ;

  /**
   * The atlas icon key that determines which icon is displayed by the interaction prompt.
   * Choose from built-in icon keys such as `"keyboard_e"`, `"keyboard_space"`,
   * `"mouse_left"`, `"tap-outline"` (for mobile), and many more.
   *
   * Defaults to `"keyboard_e"` on desktop and `"tap-outline"` on mobile.
   */
  atlas?: (typeof atlasInputs)[number];

  /**
   * The keyboard key code(s) that trigger the interaction. Uses the `KeyboardEvent.code`
   * format (e.g., `"KeyE"`, `"Space"`, `"Enter"`). Can be a single string or an array
   * of strings to allow multiple trigger keys. Defaults to `"KeyE"`.
   */
  key?: string | string[];

  /**
   * Whether the interaction prompt always faces the camera (billboard mode). When `true`,
   * the {@link rotation} property is ignored. Defaults to `true`.
   */
  billboard?: boolean;

  /**
   * The color of the interaction prompt icon, as a numeric color value
   * (e.g., `0xff0000` for red, `0xffffff` for white). Optional.
   */
  color?: number;
}
