// @ts-check

import { Component3D } from "../../abstract/component-3d";
import { VideoFactory } from "../../../internal/media/video";
import VideoWrapper from "../../../internal/media/video/wrapper";
import { USER_INTERACTED } from "../../../internal/constants";
import { VideoComponentData } from "./video-data";
import { Box3 } from "three";

import { PositionalAudio } from "../../../internal/utils/positional-audio";
import BorderFactory, {
  BorderOpts,
  BorderWrapper,
} from "../../../internal/border";
import { LEGACY_fixScale } from "../../../internal/utils/legacy";

export type { VideoComponentData } from "./video-data";

/**
 * @public
 *
 * A component that displays a video in 3D space with audio spatialization support.
 *
 * The video can be rendered on a flat plane or a curved surface (controlled by
 * {@link VideoComponentData.displayMode}), and supports two audio spatialization modes:
 * ambient (uniform volume) and spatial (distance-based attenuation).
 * See {@link VideoComponentData.audioType} for details.
 *
 * The component also supports an optional decorative border frame around the video
 * (see {@link VideoComponentData.hasBorder} and related border properties), adjustable
 * opacity, and a preview image displayed when the video is not playing.
 *
 * Use {@link play} and {@link pause} to control video playback programmatically,
 * or set {@link VideoComponentData.autoPlay} to start playback automatically.
 *
 * See {@link VideoComponentData} for the full data schema used to configure a video component.
 *
 * @example
 * // Create a basic flat video with autoplay and spatial audio
 * const video = await space.components.create({
 *   type: "video",
 *   url: "https://example.com/video.mp4",
 *   position: { x: 0, y: 2, z: -5 },
 *   rotation: { x: 0, y: 0, z: 0 },
 *   scale: { x: 1, y: 1, z: 1 },
 *   autoPlay: true,
 *   volume: 0.8,
 *   audioType: "spatial",
 *   audioRange: 10,
 *   opacity: 1,
 *   displayMode: "flat",
 *   curvedAngle: Math.PI / 4,
 * });
 *
 * @example
 * // Create a curved video with a border and ambient audio
 * const curvedVideo = await space.components.create({
 *   type: "video",
 *   url: "https://example.com/presentation.mp4",
 *   preview: "https://example.com/thumbnail.jpg",
 *   position: { x: 0, y: 3, z: -8 },
 *   autoPlay: false,
 *   volume: 1,
 *   audioType: "ambient",
 *   audioRange: 3,
 *   opacity: 1,
 *   displayMode: "curved",
 *   curvedAngle: 0.5,
 *   hasBorder: true,
 *   borderColor: "#222222",
 *   borderSize: 0.08,
 *   borderDepth: 0.15,
 *   borderOpacity: 1,
 * });
 *
 * // Start playback manually
 * curvedVideo.play();
 *
 * // Check if it's playing
 * console.log(curvedVideo.isPlaying); // true
 *
 * // Pause it
 * curvedVideo.pause();
 */
export class VideoComponent extends Component3D<VideoComponentData> {
  //
  #videoFactory: VideoFactory = null;

  private _video: VideoWrapper = null;

  private _border: BorderWrapper = null;

  private _posAudio: PositionalAudio = null;

  /**
   * @internal
   */
  constructor(opts) {
    super(opts);

    this.#videoFactory = opts.videoFactory;
  }

  /** @internal */
  protected async init() {
    //
    await this._initVideo();
  }

  private _prevData = {
    url: null,
    preview: null,
  };

  private async _initVideo() {
    //
    this._disposeVideo();

    this._prevData.url = this.data.url;

    this._prevData.preview = this.data.preview;

    this._video = await this.#videoFactory.get(this, this.data);

    const scaleRatio = this._video.scaleRatio;

    this._border = BorderFactory.get({
      component: this,
      borderOpts: {
        borderSize: this.data.borderSize,
        borderDepth: this.data.borderDepth,
        borderColor: this.data.borderColor,
        borderOpacity: this.data.borderOpacity,
        hasBorder: this.data.hasBorder,
        scaleRatio,
      },
    });

    this.space.add(this._border.getCollisionMesh());

    LEGACY_fixScale(this, scaleRatio);

    if (this._videoEl) {
      //
      this.container._audioManager.addAudioSource(this, this._videoEl);
    }

    USER_INTERACTED.then(() => {
      //
      if (this._videoEl == null) {
        //
        return;
      }
      this._posAudio = new PositionalAudio();

      this.add(this._posAudio);

      this._posAudio.setSource(this._videoEl);

      this._updateAudioType();
    });

    this.add(this._video);

    this._update3D();
  }

  private _disposeVideo() {
    //
    if (this._video == null) return;

    this.container._audioManager.removeAudioSource(this);

    this._video?.dispose();

    this.remove(this._video);

    this._video = null;

    this._posAudio?.dispose();
  }

  private _updateVideo() {
    //
    if (
      this.data.url !== this._prevData.url ||
      this.data.preview !== this._prevData.preview
    ) {
      return this._initVideo();
    }
  }

  private get _videoEl() {
    //
    return this._video?.videoData?.video;
  }

  private _updateAudioType() {
    //
    if (this._posAudio == null) return;

    this._posAudio.setAudioType(this.data.audioType);

    if (this.data.audioType === "spatial") {
      this._posAudio.setVolumeRange(this.data.audioRange);
    }
  }

  /**
   * @internal
   */
  onDataChange(opts) {
    //
    const res = this._updateVideo();

    this._update3D();

    if (
      opts.prev?.displayMode != this.data.displayMode ||
      opts.prev?.curvedAngle != this.data.curvedAngle
    ) {
      this._video.updateDisplayMode(this.data);
    }

    return res;
  }

  private _update3D() {
    //
    if (this._videoEl == null || this._video == null) return;

    if (this.data.autoPlay && !this.isPlaying) {
      this._video.play();
    } else if (!this.data.autoPlay && this.isPlaying) {
      this._video.pause();
    }

    this._video.opacity = this.data.opacity;

    this._updateAudioType();

    BorderFactory.updateBorder(this._border, {
      borderColor: this.data.borderColor,
      borderSize: this.data.borderSize,
      borderDepth: this.data.borderDepth,
      borderOpacity: this.data.borderOpacity,
      hasBorder: this.data.hasBorder,
      scaleRatio: this._video.scale.x,
    });
  }

  /**
   * @internal
   */
  getCollisionMesh() {
    return this._border.getCollisionMesh();
  }

  protected _getBBoxImp(target: Box3) {
    //
    return target.setFromObject(this.getCollisionMesh());
  }

  /** @internal */
  protected dispose() {
    //
    this._disposeVideo();

    this._border.getCollisionMesh().removeFromParent();

    BorderFactory.dispose(this._border);
  }

  /**
   * Starts or resumes video playback.
   */
  play() {
    return this._video.play();
  }

  /**
   * Pauses video playback at the current position.
   */
  pause() {
    return this._video.pause();
  }

  /**
   * Whether the video is currently playing. Returns `true` if the video is actively
   * playing, `false` otherwise.
   */
  get isPlaying() {
    return this._video?._isPlaying;
  }
}
