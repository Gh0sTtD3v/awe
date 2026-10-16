/**
 * Proximity voice chat over peer-to-peer WebRTC. The server only decides who
 * should be connected (players in voice, near each other) and relays the
 * WebRTC handshake between them; audio flows player to player.
 *
 * Pure functions so the server and tests share them.
 */

/** Players closer than this get connected. */
export const VOICE_CONNECT_RANGE = 25;
/** ...and stay connected until further than this, so walking along the edge doesn't flap. */
export const VOICE_DISCONNECT_RANGE = 32;
/** Voices fade out completely at this distance (client-side audio). */
export const VOICE_HEARING_RANGE = 22;
/** Each player connects to at most this many others, nearest first. */
export const VOICE_MAX_PEERS = 12;

export interface VoiceMember {
  sessionId: string;
  x: number;
  y: number;
  z: number;
}

/** One connection a client should hold. */
export interface VoicePeer {
  sessionId: string;
  /** Exactly one side of each pair makes the WebRTC offer. */
  initiator: boolean;
  /** Whether this peer may be heard: has Speak and isn't muted by a moderator. */
  canSpeak: boolean;
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function dist(a: VoiceMember, b: VoiceMember) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * Which pairs of members should be connected now. Existing pairs survive up
 * to the disconnect range; new ones need the connect range. Nobody exceeds
 * `maxPeers`: nearest first, existing connections preferred on ties.
 */
export function computeVoicePairs(
  members: VoiceMember[],
  previous: ReadonlySet<string>,
  maxPeers = VOICE_MAX_PEERS,
): Set<string> {
  const candidates: { key: string; a: string; b: string; d: number; kept: boolean }[] = [];

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i];
      const b = members[j];
      const key = pairKey(a.sessionId, b.sessionId);
      const kept = previous.has(key);
      const d = dist(a, b);
      if (d <= (kept ? VOICE_DISCONNECT_RANGE : VOICE_CONNECT_RANGE)) {
        candidates.push({ key, a: a.sessionId, b: b.sessionId, d, kept });
      }
    }
  }

  candidates.sort((x, y) => x.d - y.d || Number(y.kept) - Number(x.kept));

  const count = new Map<string, number>();
  const pairs = new Set<string>();
  for (const c of candidates) {
    if ((count.get(c.a) ?? 0) >= maxPeers || (count.get(c.b) ?? 0) >= maxPeers) continue;
    pairs.add(c.key);
    count.set(c.a, (count.get(c.a) ?? 0) + 1);
    count.set(c.b, (count.get(c.b) ?? 0) + 1);
  }
  return pairs;
}

/** The peer list one member should hold, given the pairs. */
export function peersOf(sessionId: string, pairs: ReadonlySet<string>, canSpeak: (id: string) => boolean): VoicePeer[] {
  const peers: VoicePeer[] = [];
  for (const key of pairs) {
    const [a, b] = key.split("|");
    if (a !== sessionId && b !== sessionId) continue;
    const other = a === sessionId ? b : a;
    peers.push({ sessionId: other, initiator: sessionId < other, canSpeak: canSpeak(other) });
  }
  return peers.sort((x, y) => (x.sessionId < y.sessionId ? -1 : 1));
}

export function samePeers(a: VoicePeer[] | undefined, b: VoicePeer[]): boolean {
  if (!a || a.length !== b.length) return false;
  return a.every((p, i) => p.sessionId === b[i].sessionId && p.canSpeak === b[i].canSpeak && p.initiator === b[i].initiator);
}

// ── Signalling payloads ──────────────────────────────────────────────────────

export type VoiceSignal =
  | { type: "description"; sdp: { type: "offer" | "answer"; sdp: string } }
  | { type: "candidate"; candidate: { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null } };

/** Keeps relayed payloads small and well-formed. */
export const MAX_SIGNAL_BYTES = 16 * 1024;

export function isVoiceSignal(value: unknown): value is VoiceSignal {
  if (value == null || typeof value !== "object") return false;
  const v = value as any;
  if (v.type === "description") {
    return (
      v.sdp != null &&
      (v.sdp.type === "offer" || v.sdp.type === "answer") &&
      typeof v.sdp.sdp === "string" &&
      v.sdp.sdp.length <= MAX_SIGNAL_BYTES
    );
  }
  if (v.type === "candidate") {
    return v.candidate != null && typeof v.candidate.candidate === "string" && v.candidate.candidate.length <= 2048;
  }
  return false;
}
