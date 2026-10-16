import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  computeVoicePairs,
  isVoiceSignal,
  pairKey,
  peersOf,
  VOICE_CONNECT_RANGE,
  VOICE_DISCONNECT_RANGE,
} from "../shared/voice";
import { VoiceDirector } from "../server/voice-director";
import { voiceConfigFor } from "../server/voice-config";

const at = (sessionId: string, x: number) => ({ sessionId, x, y: 0, z: 0 });

describe("voice pairing", () => {
  it("connects players in range and keeps them connected until the larger range", () => {
    const near = computeVoicePairs([at("a", 0), at("b", VOICE_CONNECT_RANGE - 1), at("c", 500)], new Set());
    expect([...near]).toEqual([pairKey("a", "b")]);

    // Drifting apart past the connect range but within the disconnect range stays connected...
    const kept = computeVoicePairs([at("a", 0), at("b", VOICE_DISCONNECT_RANGE - 1)], near);
    expect(kept.has(pairKey("a", "b"))).toBe(true);
    // ...but the same distance doesn't start a new connection.
    expect(computeVoicePairs([at("a", 0), at("b", VOICE_DISCONNECT_RANGE - 1)], new Set()).size).toBe(0);
    expect(computeVoicePairs([at("a", 0), at("b", VOICE_DISCONNECT_RANGE + 1)], near).size).toBe(0);
  });

  it("caps connections per player, closest pairs first", () => {
    const members = [at("me", 0), at("x1", 1), at("x2", 2), at("x3", 3), at("x4", 4)];
    const pairs = computeVoicePairs(members, new Set(), 2);
    for (const m of members) expect(peersOf(m.sessionId, pairs, () => true).length).toBeLessThanOrEqual(2);
    expect(peersOf("me", pairs, () => true).map((p) => p.sessionId)).toContain("x1");
  });

  it("gives each pair exactly one initiator", () => {
    const pairs = new Set([pairKey("a", "b")]);
    expect(peersOf("a", pairs, () => true)[0].initiator).toBe(true);
    expect(peersOf("b", pairs, () => true)[0].initiator).toBe(false);
  });

  it("validates relayed handshake payloads", () => {
    expect(isVoiceSignal({ type: "description", sdp: { type: "offer", sdp: "v=0" } })).toBe(true);
    expect(isVoiceSignal({ type: "candidate", candidate: { candidate: "candidate:1 1 udp" } })).toBe(true);
    expect(isVoiceSignal({ type: "description", sdp: { type: "rollback", sdp: "" } })).toBe(false);
    expect(isVoiceSignal({ type: "description", sdp: { type: "offer", sdp: "x".repeat(20_000) } })).toBe(false);
    expect(isVoiceSignal({ type: "nope" })).toBe(false);
  });
});

describe("VoiceDirector", () => {
  it("only reports peer lists that changed, and empties the lists of players who left", () => {
    const director = new VoiceDirector();
    let speak = true;
    const first = director.update([at("a", 0), at("b", 5)], () => speak);
    expect(first.get("a")).toEqual([{ sessionId: "b", initiator: true, canSpeak: true }]);
    expect(director.connected("a", "b")).toBe(true);

    expect(director.update([at("a", 0), at("b", 5)], () => speak).size).toBe(0);

    speak = false; // muted: listeners must learn it
    expect(director.update([at("a", 0), at("b", 5)], () => speak).get("a")?.[0].canSpeak).toBe(false);

    const left = director.update([at("a", 0)], () => true);
    expect(left.get("a")).toEqual([]);
    expect(left.get("b")).toEqual([]);
    expect(director.connected("a", "b")).toBe(false);
  });
});

describe("voice ICE config", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("uses Google STUN by default and no TURN", () => {
    delete process.env.AWE_STUN_URLS;
    delete process.env.AWE_TURN_URLS;
    expect(voiceConfigFor("s1").iceServers).toEqual([
      { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ]);
  });

  it("issues expiring coturn credentials from a shared secret", () => {
    process.env.AWE_TURN_URLS = "turn:turn.example.com:3478";
    process.env.AWE_TURN_SECRET = "s3cret";
    const turn = voiceConfigFor("s1", 1_000_000).iceServers[1];
    expect(turn.username).toBe(`${1000 + 86400}:s1`);
    expect(turn.credential).toBe(crypto.createHmac("sha1", "s3cret").update(turn.username!).digest("base64"));
  });
});
