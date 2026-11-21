import { trackTargets, type MusicZoneDef } from "../../shared/music-zones";
import type { Vec3 } from "../../shared/gates";

/** Volume changes are smoothed over about this long (s): no clicks at a hard edge. */
const SMOOTHING = 0.25;
/** A track that has been silent this long (s) is paused. */
const PAUSE_AFTER = 1.5;
/** A track silent this long (s) is released (download and memory freed); its position is remembered. */
const RELEASE_AFTER = 20;
/** Don't retry a refused play() more often than this (s). */
const RETRY_PLAY = 1;
/** Below this volume a track counts as silent. */
const SILENT = 0.002;

interface Track {
  url: string;
  audio: HTMLAudioElement;
  /** Set when the file is on this site: volume goes through Web Audio (works on iPhone too). */
  gain: GainNode | null;
  source: MediaElementAudioSourceNode | null;
  /** Volume currently applied, 0 to 1. */
  level: number;
  silentFor: number;
  lastPlayTry: number;
}

/**
 * Plays the music of music zones. There is one track per music file, shared
 * by every zone that uses it, so a path of touching zones with the same song
 * plays it continuously. A file is only downloaded once the listener is
 * inside one of its zones or their fade band, and is released again after a
 * while out of earshot.
 */
export class MusicPlayer {
  private tracks = new Map<string, Track>();
  /** Where a released track was, to continue from there (unless it restarts on enter). */
  private positions = new Map<string, number>();
  private context: AudioContext | null = null;
  private time = 0;

  /** Call every frame with the zones in the loaded chunks and where the listener is. */
  update(zones: MusicZoneDef[], listener: Vec3 | null, dt: number): void {
    this.time += dt;
    const targets = trackTargets(zones, listener);

    for (const target of targets.values()) {
      let track = this.tracks.get(target.url);
      if (!track) {
        // Nothing is downloaded until the music is actually audible.
        if (target.volume <= SILENT) continue;
        track = this.create(target.url, target.restartOnEnter);
        this.tracks.set(target.url, track);
      }
      track.audio.loop = target.loop;
      this.step(track, target.volume, dt, target.restartOnEnter);
    }

    // Files no zone uses any more (removed, or chunk unloaded) fade out.
    for (const track of this.tracks.values()) {
      if (!targets.has(track.url)) this.step(track, 0, dt, false);
    }
  }

  /** Stop and release everything (leaving the world). */
  dispose(): void {
    for (const url of [...this.tracks.keys()]) this.release(url, false);
    this.positions.clear();
    void this.context?.close().catch(() => {});
    this.context = null;
  }

  private create(url: string, restartOnEnter: boolean): Track {
    const audio = new Audio();
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audio.src = url;

    // Continue a released track where it was.
    const resumeAt = restartOnEnter ? 0 : this.positions.get(url) ?? 0;
    if (resumeAt > 0) {
      audio.addEventListener("loadedmetadata", () => (audio.currentTime = resumeAt), { once: true });
    }

    let gain: GainNode | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    if (isSameOrigin(url)) {
      try {
        this.context ??= new AudioContext();
        gain = this.context.createGain();
        gain.gain.value = 0;
        source = this.context.createMediaElementSource(audio);
        source.connect(gain).connect(this.context.destination);
      } catch {
        gain = null;
        source = null;
      }
    }
    if (!gain) audio.volume = 0;

    return { url, audio, gain, source, level: 0, silentFor: 0, lastPlayTry: -Infinity };
  }

  private step(track: Track, target: number, dt: number, restartOnEnter: boolean): void {
    // Ease toward the target volume.
    track.level += (target - track.level) * (1 - Math.exp(-dt / SMOOTHING));
    if (target <= SILENT && track.level < SILENT) track.level = 0;
    this.apply(track);

    const { audio } = track;
    if (track.level > SILENT) {
      track.silentFor = 0;
      if (audio.paused && this.time - track.lastPlayTry >= RETRY_PLAY) {
        track.lastPlayTry = this.time;
        if (audio.ended) audio.currentTime = 0;
        void this.context?.resume().catch(() => {});
        // Refused until the player has clicked or pressed a key; retried later.
        void audio.play().catch(() => {});
      }
      return;
    }

    track.silentFor += dt;
    if (!audio.paused && track.silentFor >= PAUSE_AFTER) {
      audio.pause();
      if (restartOnEnter || audio.ended) audio.currentTime = 0;
    }
    if (track.silentFor >= RELEASE_AFTER) this.release(track.url, !restartOnEnter);
  }

  /** Stop a track and free its download, optionally remembering where it was. */
  private release(url: string, remember: boolean): void {
    const track = this.tracks.get(url);
    if (!track) return;
    if (remember && !track.audio.ended) this.positions.set(url, track.audio.currentTime);
    else this.positions.delete(url);
    track.audio.pause();
    track.audio.removeAttribute("src");
    track.audio.load();
    track.source?.disconnect();
    track.gain?.disconnect();
    this.tracks.delete(url);
  }

  private apply(track: Track): void {
    const level = Math.min(1, Math.max(0, track.level));
    if (track.gain) track.gain.gain.value = level;
    else track.audio.volume = level;
  }
}

function isSameOrigin(url: string): boolean {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}
