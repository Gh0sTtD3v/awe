import { Store } from "@/hooks/use-store";

export type VoiceMode = "ptt" | "open";

export type MicStatus =
  /** Not asked yet, or left voice. */
  | "off"
  | "requesting"
  | "ready"
  /** The browser or the player refused the microphone. */
  | "denied"
  /** No Speak permission: listening only. */
  | "listen-only";

export interface VoiceState {
  joined: boolean;
  mic: MicStatus;
  mode: VoiceMode;
  /** Self-mute (open mic mode). */
  selfMuted: boolean;
  /** The microphone is live right now. */
  transmitting: boolean;
  /** Own microphone level, 0..1, for the sound check. */
  level: number;
  /** Players currently heard talking, by session id (the local player included). */
  speaking: Record<string, boolean>;
  /** Peers we hold a connection to, and whether it's up. */
  peers: Record<string, "connecting" | "connected" | "failed">;
}

const MODE_KEY = "ghostt.voice.mode";

function savedMode(): VoiceMode {
  try {
    return localStorage.getItem(MODE_KEY) === "open" ? "open" : "ptt";
  } catch {
    return "ptt";
  }
}

export const voiceStore = new Store<VoiceState>({
  joined: false,
  mic: "off",
  mode: typeof window === "undefined" ? "ptt" : savedMode(),
  selfMuted: false,
  transmitting: false,
  level: 0,
  speaking: {},
  peers: {},
});

export function setVoiceMode(mode: VoiceMode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // per-viewer convenience only
  }
  voiceStore.update({ mode });
}

function sameRecord<T>(a: Record<string, T>, b: Record<string, T>) {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

/** Polled ~10×/s; only notifies on change. */
export function setVoiceActivity(level: number, speaking: Record<string, boolean>) {
  const s = voiceStore.state;
  const rounded = Math.round(level * 20) / 20;
  if (s.level === rounded && sameRecord(s.speaking, speaking)) return;
  voiceStore.update({ level: rounded, speaking });
}

export function setVoicePeers(peers: VoiceState["peers"]) {
  if (sameRecord(voiceStore.state.peers, peers)) return;
  voiceStore.update({ peers });
}
