import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, type Room } from "@colyseus/sdk";
import type { Server } from "colyseus";
import type { GameState } from "../shared/game-state";
import {
  ACCESS_SELF_MESSAGE,
  BANNED_CLOSE_CODE,
  CHUNK_DENIED_MESSAGE,
  GATE_ACCESS_MESSAGE,
  KICKED_CLOSE_CODE,
  MOD_BAN_MESSAGE,
  MOD_KICK_MESSAGE,
  MOD_RESULT_MESSAGE,
  PLAYER_UPDATE_MESSAGE,
  SCREEN_CONTROL_MESSAGE,
  SCREEN_DURATION_MESSAGE,
  SCREEN_REFUSED_MESSAGE,
  SCREEN_STATE_MESSAGE,
  MOD_MUTE_MESSAGE,
  VOICE_CONFIG_MESSAGE,
  VOICE_JOIN_MESSAGE,
  VOICE_PEERS_MESSAGE,
  VOICE_SIGNAL_MESSAGE,
  type VoiceConfigMessage,
  type VoicePeersMessage,
  type VoiceSignalIn,
  type AccessSelfMessage,
  type ChunkDeniedMessage,
  type GateAccessMessage,
  type ModResultMessage,
  type ScreenRefusedMessage,
  type ScreenStateMessage,
} from "../shared/messages";

/**
 * Roles enforced by the real Colyseus room. Privy mode with a fake Privy
 * client: the access token *is* the user's DID, so each connection can be a
 * different person. Roles and members come from a temp access file.
 */

const OWNER = "did:privy:owner";
const ADMIN = "did:privy:admin";
const MOD = "did:privy:mod";
const GUEST = "did:privy:guest";
const TROLL = "did:privy:troll";
/** Holds the ROIDS that gate-1 asks for, so may use that apartment's TV. */
const TENANT = "did:privy:tenant";
const TENANT_WALLET = "cosmos1tenanttestaddress";
const RESTRICTED = { x: 10_000, y: 0, z: 0 }; // chunk 1_0_0
const PORT = 2900 + Math.floor(Math.random() * 300);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ghostt-access-"));
const accessFile = path.join(tmp, "access.json");

let server: Server;
let access: typeof import("@oncyberio/studio/server-gating");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until<T>(read: () => T | undefined, timeout = 5000): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = read();
    if (value != null && value !== false) return value;
    await sleep(25);
  }
  throw new Error("Timed out waiting");
}

interface Player {
  room: Room<any, GameState>;
  self: AccessSelfMessage[];
  gates: GateAccessMessage[];
  denials: ChunkDeniedMessage[];
  results: ModResultMessage[];
  screens: ScreenStateMessage[];
  refused: ScreenRefusedMessage[];
  voiceConfig: VoiceConfigMessage[];
  voicePeers: VoicePeersMessage[];
  signals: VoiceSignalIn[];
  leftWith: number | null;
}

async function join(token: string, options: Record<string, unknown> = {}): Promise<Player> {
  const room = await new Client(`ws://localhost:${PORT}`).joinOrCreate<GameState>("game", { accessToken: token, ...options });
  const p: Player = { room, self: [], gates: [], denials: [], results: [], screens: [], refused: [], voiceConfig: [], voicePeers: [], signals: [], leftWith: null };
  room.onMessage(VOICE_CONFIG_MESSAGE, (m: VoiceConfigMessage) => p.voiceConfig.push(m));
  room.onMessage(VOICE_PEERS_MESSAGE, (m: VoicePeersMessage) => p.voicePeers.push(m));
  room.onMessage(VOICE_SIGNAL_MESSAGE, (m: VoiceSignalIn) => p.signals.push(m));
  room.onMessage(SCREEN_STATE_MESSAGE, (m: ScreenStateMessage) => p.screens.push(m));
  room.onMessage(SCREEN_REFUSED_MESSAGE, (m: ScreenRefusedMessage) => p.refused.push(m));
  room.onMessage(ACCESS_SELF_MESSAGE, (m: AccessSelfMessage) => p.self.push(m));
  room.onMessage(GATE_ACCESS_MESSAGE, (m: GateAccessMessage) => p.gates.push(m));
  room.onMessage(CHUNK_DENIED_MESSAGE, (m: ChunkDeniedMessage) => p.denials.push(m));
  room.onMessage(MOD_RESULT_MESSAGE, (m: ModResultMessage) => p.results.push(m));
  room.onLeave((code: number) => {
    p.leftWith = code;
  });
  await until(() => p.self[0]);
  return p;
}

function move(p: Player, at: { x: number; y: number; z: number }) {
  p.room.send(PLAYER_UPDATE_MESSAGE, { ...at, rotY: 0, anim: "idle" });
}

const stateOf = (p: Player) => p.room.state.players.get(p.room.sessionId)!;

let guest: Player;
let mod: Player;
let admin: Player;

beforeAll(async () => {
  // A members-only chunk, and a token gate nobody holds the tokens for.
  fs.writeFileSync(
    path.join(tmp, "chunk-config.json"),
    JSON.stringify({ "1_0_0": { info: { title: "Vault" }, auth: ["vip"] } }),
  );
  fs.mkdirSync(path.join(tmp, "chunks"));
  fs.writeFileSync(
    path.join(tmp, "chunks", "0_0_0.json"),
    JSON.stringify({
      id: "0_0_0",
      assets: {
        "gate-1": {
          id: "gate-1",
          type: "token-gate",
          position: { x: 10, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 4, y: 4, z: 4 },
          requirementType: "cft20",
          ticker: "ROIDS",
          minAmount: "100",
          exitOffset: { x: -6, y: 0, z: 0 },
        },
        cinema: {
          id: "cinema",
          type: "video-screen",
          position: { x: -20, y: 2, z: 0 },
          playlist: [{ title: "One", url: "https://example.com/1.mp4" }, { title: "Two", url: "https://example.com/2.mp4" }],
          loop: "all",
          volume: 0.5,
        },
        "apt-tv": {
          id: "apt-tv",
          type: "video-screen",
          position: { x: 12, y: 2, z: 0 },
          playlist: [{ url: "https://example.com/apt.mp4" }],
          ads: [{ title: "Sponsor", url: "https://example.com/ad.mp4" }],
          controlGate: "gate-1",
        },
      },
    }),
  );
  fs.writeFileSync(path.join(tmp, "holdings.json"), JSON.stringify({ [TENANT_WALLET]: { cft20: { ROIDS: "500" } } }));
  fs.writeFileSync(
    accessFile,
    JSON.stringify({
      version: 1,
      roles: [
        { id: "admin", name: "Admin", color: "#ff0000", position: 4, permissions: { administrator: true } },
        { id: "moderator", name: "Moderator", color: "#0000ff", position: 3, permissions: { kick_members: true, ban_members: true, control_screens: true } },
        { id: "vip", name: "VIP", color: "#00ff00", position: 1, permissions: {} },
        { id: "everyone", name: "everyone", color: "#999999", position: 0, permissions: { speak: true } },
      ],
      members: [
        { subject: ADMIN, roleIds: ["admin"], addedAt: 1 },
        { subject: MOD, roleIds: ["moderator"], addedAt: 1 },
      ],
    }),
  );

  process.env.AWE_AUTH_MODE = "privy";
  process.env.AWE_OWNER_ID = OWNER;
  process.env.AWE_ACCESS_FILE = accessFile;
  process.env.AWE_DATA_DIR = tmp;
  process.env.AWE_HOLDINGS_FILE = path.join(tmp, "holdings.json");
  process.env.AWE_PROFILES_FILE = path.join(tmp, "profiles.json");
  fs.writeFileSync(
    process.env.AWE_PROFILES_FILE,
    JSON.stringify({ version: 1, profiles: { [ADMIN]: { username: "Boss", avatarUrl: "https://pbs.twimg.com/boss.jpg" } } }),
  );

  access = await import("@oncyberio/studio/server-gating");
  access.setPrivyClient({
    utils: () => ({
      auth: () => ({
        verifyAccessToken: async (token: string) => ({ user_id: token, app_id: "test", expiration: 0, session_id: token }),
      }),
    }),
    users: () => ({
      _get: async (id: string) => ({
        linked_accounts: id === TENANT ? [{ type: "custom_auth", custom_user_id: TENANT_WALLET }] : [],
      }),
    }),
  });

  const { Server } = await import("colyseus");
  const { GameRoom } = await import("../server/game-room");
  server = new Server();
  server.define("game", GameRoom);
  await server.listen(PORT);

  [guest, mod, admin] = await Promise.all([join(GUEST), join(MOD), join(ADMIN)]);
});

afterAll(async () => {
  for (const p of [guest, mod, admin]) await p?.room.leave().catch(() => {});
  await server?.gracefullyShutdown(false);
  const { getGateRegistry } = await import("../server/game-room");
  getGateRegistry().close();
  access?.setPrivyClient(null);
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("roles on the game server", () => {
  it("lets administrators preview the world as one role, and nobody else", async () => {
    const asVip = await join(ADMIN, { previewRole: "vip" });
    const asEveryone = await join(OWNER, { previewRole: "everyone" });
    const sneaky = await join(MOD, { previewRole: "admin" });
    try {
      // The admin plays with VIP's permissions only: into the VIP chunk, but not past the gate.
      expect(asVip.self[0]).toMatchObject({
        isOwner: false,
        chunks: { "1_0_0": true },
        preview: { roleId: "vip", name: "VIP", color: "#00ff00" },
      });
      expect(asVip.self[0].permissions.sort()).toEqual(["send_messages", "speak"]);
      expect(asVip.gates.at(-1)!.access).toEqual({ "gate-1": false });
      await until(() => stateOf(asVip)?.roleName === "VIP");

      // The owner previews as a plain visitor.
      expect(asEveryone.self[0]).toMatchObject({
        isOwner: false,
        chunks: { "1_0_0": false },
        preview: { roleId: "everyone", name: "@everyone" },
      });

      // Non-administrators can't use a preview to gain a role.
      expect(sneaky.self[0].preview).toBeNull();
      expect(sneaky.self[0].permissions).not.toContain("administrator");
      expect(sneaky.self[0].chunks).toEqual({ "1_0_0": false });
    } finally {
      for (const p of [asVip, asEveryone, sneaky]) await p.room.leave().catch(() => {});
    }
  });

  it("tells each player what they may do and shows their top role", async () => {
    expect(guest.self[0]).toMatchObject({ isOwner: false, chunks: { "1_0_0": false } });
    expect(admin.self[0].chunks).toEqual({ "1_0_0": true });
    expect(mod.self[0].permissions.sort()).toEqual(["ban_members", "control_screens", "kick_members", "send_messages", "speak"]);

    await until(() => stateOf(mod)?.roleName === "Moderator");
    expect(stateOf(mod)).toMatchObject({ roleColor: "#0000ff", rolePosition: 2 });
    expect(stateOf(guest).roleName).toBe("");
  });

  it("keeps players without a role out of a members-only chunk", async () => {
    move(guest, { x: 0, y: 0, z: 0 });
    await until(() => stateOf(guest).x === 0);

    move(guest, RESTRICTED);
    const denial = await until(() => guest.denials[0]);
    expect(denial).toMatchObject({ chunkKey: "1_0_0", title: "Vault", roles: ["VIP"], exit: { x: 0, y: 0, z: 0 } });

    await sleep(150);
    expect(stateOf(guest).x).toBe(0);
  });

  it("shows everyone each player's username and picture, and follows profile edits", async () => {
    const seen = (p: Player, of: Player) => p.room.state.players.get(of.room.sessionId);
    await until(() => seen(guest, admin)?.name === "Boss");
    expect(seen(guest, admin)?.avatar).toBe("https://pbs.twimg.com/boss.jpg");
    expect(seen(admin, guest)?.name).toBe("");

    await access.getProfileStore().update((d) => ({
      ...d,
      profiles: { ...d.profiles, [GUEST]: { userId: GUEST, username: "Newbie", avatarUrl: null, primary: null, updatedAt: 1 } },
    }));
    await until(() => seen(admin, guest)?.name === "Newbie");
  });

  it("lets administrators through chunk rules and token gates", async () => {
    expect(admin.gates.at(-1)!.access).toEqual({ "gate-1": true });
    expect(guest.gates.at(-1)!.access).toEqual({ "gate-1": false });

    move(admin, RESTRICTED);
    await until(() => stateOf(admin).x === RESTRICTED.x);
    move(admin, { x: 10, y: 0, z: 0 }); // inside the gate (a teleport, from far away)
    await until(() => stateOf(admin).x === 10);
  });

  it("applies a role given in the studio to a player already online", async () => {
    const before = guest.self.length;
    await access.getAccessStore().update((d) => ({
      ...d,
      members: [...d.members, { subject: GUEST, roleIds: ["vip"], addedAt: Date.now() }],
    }));

    const fresh = await until(() => guest.self.slice(before).find((m) => m.chunks["1_0_0"]));
    expect(fresh.roleIds).toEqual(["vip", "everyone"]);

    await sleep(1100); // denial throttle
    move(guest, RESTRICTED);
    await until(() => stateOf(guest).x === RESTRICTED.x);
  });

  it("shares video screens: only Control Screens may change them, and they move on by themselves", async () => {
    const cinema = () => guest.screens.at(-1)?.screens.cinema;
    expect(guest.screens[0].screens.cinema).toMatchObject({ index: -1, playing: false, volume: 0.5, loop: "all" });

    guest.room.send(SCREEN_CONTROL_MESSAGE, { screenId: "cinema", action: "select", index: 1 });
    expect((await until(() => guest.refused[0])).error).toMatch(/can't control/);

    mod.room.send(SCREEN_CONTROL_MESSAGE, { screenId: "cinema", action: "select", index: 1 });
    await until(() => cinema()?.index === 1 && cinema()!.playing);
    expect(admin.screens.at(-1)!.screens.cinema.index).toBe(1);

    // Any viewer reports the length; the server then advances at the end, wrapping around.
    guest.room.send(SCREEN_DURATION_MESSAGE, { screenId: "cinema", index: 1, ad: -1, duration: 0.3 });
    await until(() => cinema()?.index === 0 && cinema()!.duration === 0);
  });

  it("lets holders of an apartment's gate control that apartment's TV, ad first", async () => {
    const tenant = await join(TENANT);
    try {
      expect(tenant.gates.at(-1)!.access).toEqual({ "gate-1": true });
      const aptTv = () => tenant.screens.at(-1)?.screens["apt-tv"];

      tenant.room.send(SCREEN_CONTROL_MESSAGE, { screenId: "apt-tv", action: "select", index: 0 });
      await until(() => aptTv()?.index === 0);
      expect(aptTv()).toMatchObject({ ad: 0, playing: true });

      // Only that TV: the lobby cinema still needs Control Screens.
      tenant.room.send(SCREEN_CONTROL_MESSAGE, { screenId: "cinema", action: "stop" });
      expect((await until(() => tenant.refused[0])).screenId).toBe("cinema");

      // And the guest, without the tokens, can't touch the apartment TV.
      const before = guest.refused.length;
      guest.room.send(SCREEN_CONTROL_MESSAGE, { screenId: "apt-tv", action: "stop" });
      expect((await until(() => guest.refused[before])).screenId).toBe("apt-tv");
    } finally {
      await tenant.room.leave().catch(() => {});
    }
  });

  it("pairs nearby players in voice, relays their handshake only between them, and lets moderators mute", async () => {
    expect(mod.voiceConfig[0].iceServers[0].urls).toContain("stun:stun.l.google.com:19302");

    // mod is at the origin, guest far away in the Vault. The admin stood inside
    // gate-1 (x=10), which is a private voice room; step out next to the mod.
    move(admin, { x: 5, y: 0, z: 0 });
    await until(() => stateOf(admin).x === 5);
    for (const p of [mod, admin, guest]) p.room.send(VOICE_JOIN_MESSAGE, { on: true });
    const peers = await until(() => mod.voicePeers.at(-1)?.peers.length ? mod.voicePeers.at(-1)!.peers : undefined);
    expect(peers).toEqual([
      { sessionId: admin.room.sessionId, initiator: mod.room.sessionId < admin.room.sessionId, canSpeak: true, inRoom: false, live: false },
    ]);
    await until(() => stateOf(mod).inVoice);

    const offer = { type: "description", sdp: { type: "offer", sdp: "v=0" } };
    mod.room.send(VOICE_SIGNAL_MESSAGE, { to: admin.room.sessionId, signal: offer });
    mod.room.send(VOICE_SIGNAL_MESSAGE, { to: guest.room.sessionId, signal: offer });
    expect(await until(() => admin.signals[0])).toEqual({ from: mod.room.sessionId, signal: offer });
    await sleep(200);
    expect(guest.signals).toEqual([]);

    // The guest (no Mute Members) can't; the admin can, and listeners learn it.
    guest.room.send(MOD_MUTE_MESSAGE, { sessionId: mod.room.sessionId, muted: true });
    expect((await until(() => guest.results.at(-1))).ok).toBe(false);
    admin.room.send(MOD_MUTE_MESSAGE, { sessionId: mod.room.sessionId, muted: true });
    await until(() => admin.voicePeers.at(-1)?.peers.find((p) => p.sessionId === mod.room.sessionId)?.canSpeak === false);
    await until(() => stateOf(mod).voiceMuted);

    for (const p of [mod, admin, guest]) p.room.send(VOICE_JOIN_MESSAGE, { on: false });
    await until(() => mod.voicePeers.at(-1)?.peers.length === 0);
    guest.results.length = 0;
  });

  it("refuses moderation without the permission or against a higher rank", async () => {
    guest.room.send(MOD_KICK_MESSAGE, { sessionId: mod.room.sessionId });
    expect((await until(() => guest.results[0])).ok).toBe(false);

    mod.room.send(MOD_KICK_MESSAGE, { sessionId: admin.room.sessionId });
    expect(await until(() => mod.results[0])).toMatchObject({ ok: false, error: "Their highest role isn't below yours." });
    expect(admin.leftWith).toBeNull();
  });

  it("lets a moderator kick a lower-ranked player", async () => {
    const victim = await join(TROLL);
    mod.room.send(MOD_KICK_MESSAGE, { sessionId: victim.room.sessionId });

    expect(await until(() => victim.leftWith)).toBe(KICKED_CLOSE_CODE);
    expect(mod.results.at(-1)).toEqual({ ok: true });
  });

  it("bans by account, so they can't come back", async () => {
    const victim = await join(TROLL);
    mod.room.send(MOD_BAN_MESSAGE, { sessionId: victim.room.sessionId });

    expect(await until(() => victim.leftWith)).toBe(BANNED_CLOSE_CODE);
    const data = await access.getAccessStore().read();
    expect(data.members.find((m) => m.subject === TROLL)).toMatchObject({ banned: true, addedBy: MOD });

    await expect(join(TROLL)).rejects.toThrow(/banned/);
  });
});
