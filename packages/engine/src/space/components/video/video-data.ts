import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Button configuration for video overlay.
 */
export interface VideoButton {
  /** Action type: "redirect" opens a new tab, "popup" opens an iframe overlay. */
  action: "popup" | "redirect";
  /** URL to open. */
  link: string;
  /** Button label text. */
  text: string;
}

/**
 * @public
 *
 * Configuration data for {@link VideoComponent}.
 *
 * Configures a video displayed in 3D space. Options include video playback controls (autoplay, volume, muting),
 * audio spatialization (ambient, spatial, or directional), display mode (flat plane or curved surface),
 * visual opacity, and an optional decorative border around the video.
 */
export interface VideoComponentData extends Component3DData {
  /**
   * @internal
   */
  kit?: "cyber";

  /**
   * Component type identifier. Must be `"video"`.
   */
  type: "video";

  /**
   * if not provided, an auto id will be generated
   */
  id?: string;

  /**
   * name for the component. Defaults to ""
   */
  name?: string;

  /**
   * URL of the video file (e.g., .mp4, .webm).
   */
  url: string;

  /**
   * URL of a preview image to display when the video is not playing.
   */
  preview?: string;

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
   * Color of the video border as a CSS color string (e.g., `"#000000"`). Defaults to `"#000000"`.
   * Only visible when {@link hasBorder} is `true`.
   */
  borderColor?: number;

  /**
   * Size (thickness) of the video border. Range: 0 to 1. Defaults to `0.05`.
   * Only visible when {@link hasBorder} is `true`.
   */
  borderSize?: number;

  /**
   * Depth (extrusion) of the video border. Range: 0.01 to 1. Defaults to `0.1`.
   * Only visible when {@link hasBorder} is `true`.
   */
  borderDepth?: number;

  /**
   * Opacity of the video border, from 0 (fully transparent) to 1 (fully opaque). Defaults to `1`.
   * Only visible when {@link hasBorder} is `true`.
   */
  borderOpacity?: number;

  /**
   * Whether the video has a decorative border frame. Defaults to `false`.
   */
  hasBorder?: boolean;

  /**
   * Volume of the audio, from 0 to 1. Defaults to 1
   */
  volume?: number;

  /**
   * Type of audio spatialization for the video. Defaults to `"spatial"`.
   *
   * - `"ambient"` — Non-spatialized audio; plays at the same volume regardless of listener position.
   * - `"spatial"` — Positional audio that attenuates with distance. The falloff range is
   *   controlled by {@link audioRange}.
   */
  audioType: "ambient" | "spatial";

  /**
   * Maximum distance (in world units) at which spatial audio can be heard.
   * Range: 1 to 40. Defaults to `3`.
   * Only effective when {@link audioType} is `"spatial"`.
   */
  audioRange: number;

  /**
   * Whether the video should start playing automatically when the component is initialized.
   * Defaults to `true`.
   */
  autoPlay: false;

  /**
   * Opacity of the video surface, from 0 (fully transparent) to 1 (fully opaque). Defaults to `1`.
   */
  opacity: number;

  /**
   * Display mode of the video surface. Defaults to `"flat"`.
   *
   * - `"flat"` — The video is rendered on a standard flat plane.
   * - `"curved"` — The video is rendered on a curved surface. The arc angle is controlled
   *   by {@link curvedAngle}.
   */
  displayMode: "flat" | "curved";

  /**
   * Arc angle of the curved video surface, in radians. Range: 0 to `Math.PI / 4` (~0.785).
   * Defaults to `Math.PI / 4`.
   * Only used when {@link displayMode} is `"curved"`.
   */
  curvedAngle: number;

  /**
   * Distance (in world units) at which the video file begins loading.
   * Until the player is within this range, only the preview image is shown.
   * Range: 1 to 100. Defaults to `20`.
   */
  loadDistance?: number;

  /**
   * @internal
   */
  muted?: boolean;

  /**
   * Keyboard key that triggers the interaction overlay.
   * When set and the player is within focusDistance, an info card is shown.
   * Valid values: `""`, `"E"`, `"F"`, `"G"`, `"I"`. Defaults to `""` (disabled).
   */
  actionKey?: string;

  /**
   * Distance from the video at which the interaction becomes available.
   * Only applies when actionKey is set. Defaults to `9`.
   */
  focusDistance?: number;

  /**
   * Title displayed on the info label. Only shown when actionKey is set.
   */
  title?: string;

  /**
   * Description displayed on the info label. Only shown when actionKey is set.
   */
  description?: string;

  /**
   * Artist name displayed on the info label. Only shown when actionKey is set.
   */
  artist?: string;

  /**
   * Background color of the info card as a CSS hex string. Defaults to `"#091117"`.
   */
  infoBgColor?: string;

  /**
   * Text color of the info card as a CSS hex string. Defaults to `"#ffffff"`.
   */
  infoTextColor?: string;

  /**
   * Opacity of the info card background (0–100). Defaults to `75`.
   */
  infoOpacity?: number;

  /**
   * Up to 3 buttons shown in the fullscreen overlay.
   * Each button can either open a URL in a new tab ("redirect") or in an iframe popup ("popup").
   */
  buttons?: VideoButton[];
}
