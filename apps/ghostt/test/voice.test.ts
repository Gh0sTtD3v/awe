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

  it("keeps rooms private: same room at any distance, nobody across the walls", () => {
    const inLounge = (id: string, x: number) => ({ ...at(id, x), room: "zone:lounge" });
    const pairs = computeVoicePairs(
      [inLounge("a", 0), inLounge("b", 500), at("c", 1), { ...at("d", 2), room: "gate:vault" }],
      new Set(),
    );
    // a and b share the lounge though they're far apart; c stands next to a but is outside.
    expect([...pairs]).toEqual([pairKey("a", "b")]);
  });

  it("leaves a room's voices when walking out", () => {
    const together = computeVoicePairs([{ ...at("a", 0), room: "zone:lounge" }, { ...at("b", 3), room: "zone:lounge" }], new Set());
    expect(together.size).toBe(1);
    // Still close, but b stepped out of the lounge.
    expect(computeVoicePairs([{ ...at("a", 0), room: "zone:lounge" }, at("b", 3)], together).size).toBe(0);
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
    expect(first.get("a")).toEqual([{ sessionId: "b", initiator: true, canSpeak: true, inRoom: false, live: false }]);
    expect(director.connected("a", "b")).toBe(true);

    expect(director.update([at("a", 0), at("b", 5)], () => speak).size).toBe(0);

    speak = false; // muted: listeners must learn it
    expect(director.update([at("a", 0), at("b", 5)], () => speak).get("a")?.[0].canSpeak).toBe(false);

    // Both walk into the same room: the pair stays, now heard at full volume.
    const room = director.update(
      [
        { ...at("a", 0), room: "zone:lounge" },
        { ...at("b", 5), room: "zone:lounge" },
      ],
      () => speak,
    );
    expect(room.get("a")?.[0].inRoom).toBe(true);
    expect(room.get("b")?.[0].inRoom).toBe(true);

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

describe("chunk broadcasts", () => {
  const m = (sessionId: string, x: number, extra: object = {}) => ({ sessionId, x, y: 0, z: 0, chunk: "0_0_0", ...extra });

  it("connects a live speaker to everyone outside rooms in the same chunk, at any distance", () => {
    const members = [
      m("speaker", 0, { broadcasting: true }),
      m("far", 500),
      m("other-chunk", 600, { chunk: "1_0_0" }),
      m("boxed", 30, { room: "zone:lounge" }),
    ];
    const pairs = computeVoicePairs(members, new Set());
    expect([...pairs]).toEqual([pairKey("speaker", "far")]);

    const byId = new Map(members.map((x) => [x.sessionId, x]));
    const memberOf = (id: string) => byId.get(id);
    expect(peersOf("far", pairs, () => true, memberOf)[0]).toMatchObject({ sessionId: "speaker", live: true });
    expect(peersOf("speaker", pairs, () => true, memberOf)[0]).toMatchObject({ sessionId: "far", live: false });
  });

  it("doesn't use up listeners' proximity slots, and caps the audience", () => {
    const crowd = Array.from({ length: 5 }, (_, i) => m(`l${i}`, 1000 + i));
    const pairs = computeVoicePairs([m("speaker", 0, { broadcasting: true }), ...crowd], new Set(), 2, 3);
    const speakerPairs = [...pairs].filter((k) => k.includes("speaker"));
    // Nearest three only, and the crowd still pairs among themselves up to 2 each.
    expect(speakerPairs.sort()).toEqual(["l0", "l1", "l2"].map((l) => pairKey("speaker", l)).sort());
    for (const l of crowd) {
      expect([...pairs].filter((k) => k.split("|").includes(l.sessionId) && !k.includes("speaker")).length).toBe(2);
    }
  });

  it("drops far listeners when the broadcast stops", () => {
    const live = computeVoicePairs([m("speaker", 0, { broadcasting: true }), m("far", 500)], new Set());
    expect(live.size).toBe(1);
    expect(computeVoicePairs([m("speaker", 0), m("far", 500)], live).size).toBe(0);
  });
});
