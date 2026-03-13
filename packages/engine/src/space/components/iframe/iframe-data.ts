import { Component3DData } from "../../abstract/component-3d-data";

import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link IframeComponent}. Describes the configuration for embedding
 * web pages or YouTube videos in the 3D scene.
 */
export interface IframeComponentData extends Component3DData {
  /**
   * @internal
   */
  kit?: "cyber";

  /**
   * The component type identifier. Must be `"iframe"`.
   */
  type: "iframe";

  /**
   * Position of the component in the space. Defaults to `{x: 0, y: 0, z: 0}`.
   */
  position?: XYZ;

  /**
   * Rotation of the component in the space, in radians. Defaults to `{x: 0, y: 0, z: 0}`.
   */
  rotation?: XYZ;

  /**
   * Scale of the component in the space. The `x` and `y` values determine the width and height
   * of the iframe display surface in world units. Defaults to `{x: 16, y: 9, z: 1}`.
   */
  scale?: XYZ;

  /**
   * The URL of the web page to embed. Supports any valid HTTP/HTTPS URL. YouTube URLs
   * (e.g. `https://www.youtube.com/watch?v=...`) are automatically detected and handled
   * with the YouTube IFrame Player API for enhanced playback with spatial audio support.
   * If the protocol is omitted, HTTPS is assumed.
   */
  url: string;

  /**
   * Color of the iframe border as a CSS color string (e.g. `"#ff0000"`).
   * Only applies when {@link hasBorder} is `true`. Defaults to `"#000000"`.
   */
  borderColor?: number;

  /**
   * Thickness of the iframe border, from 0 to 1.
   * Only applies when {@link hasBorder} is `true`. Defaults to `0.05`.
   */
  borderSize?: number;

  /**
   * Depth (extrusion) of the iframe border, from 0.01 to 1.
   * Only applies when {@link hasBorder} is `true`. Defaults to `0.1`.
   */
  borderDepth?: number;

  /**
   * Opacity of the iframe border, from 0 (fully transparent) to 1 (fully opaque).
   * Only applies when {@link hasBorder} is `true`. Defaults to `1`.
   */
  borderOpacity?: number;

  /**
   * Whether the iframe has a visible border frame around it. Defaults to `false`.
   */
  hasBorder?: boolean;

  /**
   * Configuration options for YouTube video playback. These options only take effect
   * when the {@link url} is detected as a YouTube link.
   */
  youtubeOpts: {
    /**
     * Whether the YouTube video should automatically start playing when loaded.
     * Defaults to `true`.
     */
    autoPlay: boolean;

    /**
     * The audio spatialization mode for YouTube video audio.
     *
     * - `"ambient"` — plays audio at constant volume regardless of distance from the iframe.
     * - `"spatial"` — plays positional audio that attenuates with distance (range controlled by {@link audioRange}).
     *
     * Defaults to `"ambient"`.
     */
    audioType: "ambient" | "spatial";

    /**
     * The maximum distance (in world units) at which YouTube spatial audio can be heard.
     * Only applies when {@link audioType} is `"spatial"`. Valid range is 1 to 40.
     * Defaults to `3`.
     */
    audioRange: number;

    /**
     * The volume level for YouTube video audio, from 0 (silent) to 1 (full volume).
     * Defaults to `1`.
     */
    volume: number;
  };

  /**
   * Whether the component should be displayed in live mode. When `false`, the iframe
   * is hidden and its interaction events are disabled. Defaults to `true`.
   */
  display?: boolean;
}
