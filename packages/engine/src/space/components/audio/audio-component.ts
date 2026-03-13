export type { AudioComponentData } from "./audio-data";
import {
  Component3D,
  DataChangeOpts,
} from "../../abstract/component-3d";
import { AudioLoader } from "./audio-loader";
import { AudioComponentData } from "./audio-data";
import { USER_INTERACTED } from "../../../internal/constants";
import { PositionalAudio } from "../../../internal/utils/positional-audio";

/**
 * @public
 *
 * Audio component for playing audio files in the 3D game world.
 *
 * Supports two playback modes:
 * - **Ambient**: Audio plays at constant volume regardless of the listener's distance.
 *   Use this for background music or global sound effects.
 * - **Spatial**: Audio volume attenuates based on the listener's distance from the source,
 *   using the Web Audio API's positional audio. Sound is only audible within the configured
 *   {@link AudioComponentData.audioRange | audioRange} radius. Use this for environment
 *   sounds like water, fire, or machinery.
 *
 * Playback may be deferred until the user has interacted with the page, in compliance
 * with browser autoplay policies. If {@link AudioComponentData.autoPlay | autoPlay} is set,
 * the audio will begin as soon as the user interacts.
 *
 * The component is managed by the space's internal audio manager, which coordinates
 * all active audio sources.
 *
 * See {@link AudioComponentData} for the data schema used to create an audio component.
 *
 * @example
 * ```ts
 * // Create an ambient background music component
 * const bgMusic = await space.components.create({
 *   type: "audio",
 *   url: "https://example.com/music.mp3",
 *   audioType: "ambient",
 *   volume: 0.5,
 *   loop: true,
 *   autoPlay: true,
 * });
 *
 * // Create a spatial sound effect at a specific position
 * const waterfall = await space.components.create({
 *   type: "audio",
 *   url: "https://example.com/waterfall.ogg",
 *   audioType: "spatial",
 *   audioRange: 10,
 *   volume: 0.8,
 *   loop: true,
 *   autoPlay: true,
 *   position: { x: 5, y: 0, z: -3 },
 * });
 *
 * // Control playback programmatically
 * waterfall.play();
 * waterfall.pause();
 * waterfall.stop();
 * console.log(waterfall.isPlaying); // false
 *
 * // Access the underlying HTMLAudioElement
 * console.log(waterfall.audio.duration);
 * ```
 */
export class AudioComponent extends Component3D<AudioComponentData> {
  //
  /** @internal */
  public _audio: HTMLAudioElement;

  /** @internal */
  _posAudio: PositionalAudio;

  private _loader: AudioLoader = null;

  private _isPlaying: boolean = false;

  private _disposers = [] as (() => void)[];

  /** @internal */
  protected async init() {
    //
    this._audio = await this._loader.loadAudio(this.data.url);

    this._posAudio = new PositionalAudio();

    this.add(this._posAudio);

    this._posAudio.setSource(this._audio);

    this._audio.addEventListener("ended", (event) => {
      //
      this._isPlaying = false;
    });

    if (this.data.autoPlay) {
      this.play();
    }

    this.container._audioManager.addAudioSource(this, this._audio);

    USER_INTERACTED.then(() => {
      //
      this._updateAudio({});
    });
  }

  protected _updateAutoPlay(value: boolean) {
    if (value) {
      this.play();
    } else {
      this.pause();
    }
  }

  private _updateAudio(prev: Partial<AudioComponentData>) {
    //
    if (this.data.autoPlay !== prev.autoPlay) {
      //
      this._updateAutoPlay(this.data.autoPlay);
    }

    if (this.data.loop !== prev.loop) {
      //
      this._audio.loop = this.data.loop;

      if (this._audio.loop && this.data.autoPlay && !this.isPlaying) {
        this.play();
      }
    }

    if (this.data.playbackRate !== prev.playbackRate) {
      //
      this._audio.playbackRate = this.data.playbackRate;
    }

    this._posAudio.setAudioType(this.data.audioType);

    if (this.data.audioType === "spatial") {
      this._posAudio.setVolumeRange(this.data.audioRange);
    }
  }

  /**
   * @internal
   */
  onDataChange(opts: DataChangeOpts<AudioComponentData>) {
    //
    const { prev } = opts;

    this._updateAudio(prev);
  }

  /**
   * @internal
   */
  protected dispose() {
    //
    this.stop();

    this._disposers.forEach((disposer) => {
      //
      disposer();
    });
  }

  /*****************************************************************
   *                      Public API
   *****************************************************************/

  /**
   * Starts playing the audio. If the user has not yet interacted with the page,
   * playback will be deferred until the first user interaction (due to browser
   * autoplay policies). If the audio is already playing, this has no additional effect.
   */
  play() {
    this._isPlaying = true;

    USER_INTERACTED.then(() => {
      //
      if (!this.isPlaying) return;

      this._audio.play();
    });
  }

  /**
   * Pauses the audio at the current playback position. Call {@link play} to resume
   * from where it was paused. To reset to the beginning, use {@link stop} instead.
   */
  pause() {
    //
    this._isPlaying = false;

    this._audio.pause();
  }

  /**
   * Stops the audio and resets playback to the beginning. Unlike {@link pause},
   * calling stop resets the current time to 0.
   */
  stop() {
    this._isPlaying = false;

    this._audio.currentTime = 0;
    this._audio.pause();
  }

  /**
   * Returns `true` if the audio is currently playing, `false` otherwise.
   */
  get isPlaying() {
    return this._isPlaying;
  }

  /**
   * @deprecated, use audioType "ambient" instead
   */
  get ambient() {
    return this.data.audioType === "ambient";
  }

  /**
   * @deprecated, use audioType "ambient" instead
   */
  set ambient(value) {
    this.setData({ audioType: value ? "ambient" : "spatial" });
  }

  /**
   * Returns the underlying `HTMLAudioElement` for direct access to the native audio API.
   * This can be used for advanced operations not exposed by the component's public methods,
   * such as reading `currentTime`, `duration`, or attaching native event listeners.
   */
  get audio() {
    //
    return this._audio;
  }
}
