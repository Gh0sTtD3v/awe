import { zoneGain, type MusicZoneDef } from "../../shared/music-zones";
import type { Vec3 } from "../../shared/gates";

/** Volume changes are smoothed over about this long (s): no clicks at a hard edge. */
const SMOOTHING = 0.25;
/** A track that has been silent this long (s) is paused, to save bandwidth and CPU. */
const PAUSE_AFTER = 1.5;
/** Don't retry a refused play() more often than this (s). */
const RETRY_PLAY = 1;
/** Below this volume a track counts as silent. */
const SILENT = 0.002;

interface Track {
  url: string;
  audio: HTMLAudioElement;
  /** Set when the file is on this site: volume goes through Web Audio (works on iPhone too). */
  gain: GainNode | null;
  /** Volume currently applied, 0 to 1. */
  level: number;
  silentFor: number;
  lastPlayTry: number;
  /** Still listed in the loaded chunks. */
  seen: boolean;
}

/**
 * Plays the music of music zones, each on its own track, fading each with the
 * listener's distance. Tracks start when they become audible and pause when
 * they have been silent for a moment.
 */
export class MusicPlayer {
  private tracks = new Map<string, Track>();
  private context: AudioContext | null = null;
  private time = 0;

  /** Call every frame with the zones in the loaded chunks and where the listener is. */
  update(zones: MusicZoneDef[], listener: Vec3 | null, dt: number): void {
    this.time += dt;
    for (const track of this.tracks.values()) track.seen = false;

    for (const zone of zones) {
      let track = this.tracks.get(zone.id);
      if (track && track.url !== zone.url) {
        this.dispose(zone.id);
        track = undefined;
      }
      const target = listener ? zoneGain(zone, listener) * zone.volume : 0;
      if (!track) {
        if (target <= SILENT) continue;
        track = this.create(zone);
        this.tracks.set(zone.id, track);
      }
      track.seen = true;
      track.audio.loop = zone.loop;
      this.step(track, target, dt, zone.restartOnEnter);
    }

    // Zones that were removed or unloaded fade out, then go away.
    for (const [id, track] of this.tracks) {
      if (track.seen) continue;
      this.step(track, 0, dt, false);
      if (track.audio.paused) this.dispose(id);
    }
  }

  /** Stop and release everything (leaving the world). */
  dispose(id?: string): void {
    const ids = id ? [id] : [...this.tracks.keys()];
    for (const key of ids) {
      const track = this.tracks.get(key);
      if (!track) continue;
      track.audio.pause();
      track.audio.removeAttribute("src");
      track.audio.load();
      track.gain?.disconnect();
      this.tracks.delete(key);
    }
    if (!id) {
      void this.context?.close().catch(() => {});
      this.context = null;
    }
  }

  private create(zone: MusicZoneDef): Track {
    const audio = new Audio();
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audio.src = zone.url;
    audio.loop = zone.loop;

    let gain: GainNode | null = null;
    if (isSameOrigin(zone.url)) {
      try {
        this.context ??= new AudioContext();
        gain = this.context.createGain();
        gain.gain.value = 0;
        this.context.createMediaElementSource(audio).connect(gain).connect(this.context.destination);
      } catch {
        gain = null;
      }
    }
    if (!gain) audio.volume = 0;

    return { url: zone.url, audio, gain, level: 0, silentFor: 0, lastPlayTry: -Infinity, seen: true };
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
