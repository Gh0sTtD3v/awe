import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, type Room } from "@colyseus/sdk";
import type { Server } from "colyseus";
import type { GameState } from "../shared/game-state";
import {
  ACCESS_SELF_MESSAGE,
  CHAT_MESSAGE,
  CHAT_REFUSED_MESSAGE,
  CHAT_ROOM_MESSAGE,
  CHAT_SEND_MESSAGE,
  MOD_MUTE_MESSAGE,
  PLAYER_UPDATE_MESSAGE,
  VOICE_BROADCAST_MESSAGE,
  VOICE_JOIN_MESSAGE,
  VOICE_PEERS_MESSAGE,
  type VoicePeersMessage,
  type AccessSelfMessage,
  type ChatMessage,
  type ChatRefusedMessage,
  type ChatRoomMessage,
} from "../shared/messages";

/**
 * Text chat on the real Colyseus room. Messages are relayed, never stored:
 * each player only sees what was said while they were connected, and room
 * channels only reach players standing in the room.
 */

const ALICE = "did:privy:alice";
const BOB = "did:privy:bob";
const CHARLIE = "did:privy:charlie";
const MOD = "did:privy:mod";
const ADMIN = "did:privy:admin";
/** Has the Speaker role, which gets Broadcast Voice when this version-2 world migrates. */
const SPEAKER = "did:privy:speaker";
/** Only `everyone`, which can't send messages in this world. */
const LURKER = "did:privy:lurker";

const LOUNGE = { x: 50, y: 0, z: 0 };
const GATE = { x: 10, y: 0, z: 0 };
const OUTSIDE = { x: 0, y: 0, z: 0 };
const PORT = 3300 + Math.floor(Math.random() * 300);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ghostt-chat-"));

let server: Server;
let access: typeof import("@oncyberio/studio/server-gating");
const open: Player[] = [];

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
  chat: ChatMessage[];
  refused: ChatRefusedMessage[];
  rooms: ChatRoomMessage[];
  voice: VoicePeersMessage[];
}

async function join(token: string): Promise<Player> {
  const room = await new Client(`ws://localhost:${PORT}`).joinOrCreate<GameState>("game", { accessToken: token });
  const p: Player = { room, self: [], chat: [], refused: [], rooms: [], voice: [] };
  room.onMessage(VOICE_PEERS_MESSAGE, (m: VoicePeersMessage) => p.voice.push(m));
  room.onMessage(ACCESS_SELF_MESSAGE, (m: AccessSelfMessage) => p.self.push(m));
  room.onMessage(CHAT_MESSAGE, (m: ChatMessage) => p.chat.push(m));
  room.onMessage(CHAT_REFUSED_MESSAGE, (m: ChatRefusedMessage) => p.refused.push(m));
  room.onMessage(CHAT_ROOM_MESSAGE, (m: ChatRoomMessage) => p.rooms.push(m));
  room.onMessage("*", () => {});
  await until(() => p.self[0]);
  open.push(p);
  return p;
}

const say = (p: Player, text: string, channel = "world") => p.room.send(CHAT_SEND_MESSAGE, { channel, text });
const move = (p: Player, at: { x: number; y: number; z: number }) =>
  p.room.send(PLAYER_UPDATE_MESSAGE, { ...at, rotY: 0, anim: "idle" });
const texts = (p: Player) => p.chat.map((m) => m.text);

beforeAll(async () => {
  fs.mkdirSync(path.join(tmp, "chunks"));
  fs.writeFileSync(
    path.join(tmp, "chunks", "0_0_0.json"),
    JSON.stringify({
      id: "0_0_0",
      assets: {
        lounge: {
          id: "lounge",
          type: "chat-zone",
          label: "Lounge",
          position: LOUNGE,
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 8, y: 4, z: 8 },
        },
        "gate-1": {
          id: "gate-1",
          type: "token-gate",
          label: "Vault",
          position: GATE,
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 4, y: 4, z: 4 },
          requirementType: "cft20",
          ticker: "ROIDS",
          minAmount: "100",
          exitOffset: { x: -6, y: 0, z: 0 },
        },
      },
    }),
  );
  fs.writeFileSync(path.join(tmp, "holdings.json"), "{}");
  fs.writeFileSync(
    path.join(tmp, "access.json"),
    JSON.stringify({
      version: 2,
      roles: [
        { id: "admin", name: "Admin", color: "#ff0000", position: 4, permissions: { administrator: true } },
        { id: "moderator", name: "Moderator", color: "#0000ff", position: 3, permissions: { mute_members: true, send_messages: true } },
        { id: "member", name: "Member", color: "#00ff00", position: 2, permissions: { send_messages: true } },
        { id: "speaker", name: "Speaker", color: "#f1c40f", position: 1, permissions: { send_messages: true } },
        { id: "everyone", name: "everyone", color: "#999999", position: 0, permissions: { speak: true } },
      ],
      members: [
        { subject: ADMIN, roleIds: ["admin"], addedAt: 1 },
        { subject: MOD, roleIds: ["moderator"], addedAt: 1 },
        ...[ALICE, BOB, CHARLIE].map((subject) => ({ subject, roleIds: ["member"], addedAt: 1 })),
        { subject: SPEAKER, roleIds: ["speaker"], addedAt: 1 },
      ],
    }),
  );

  process.env.AWE_AUTH_MODE = "privy";
  process.env.AWE_OWNER_ID = "did:privy:owner";
  process.env.AWE_ACCESS_FILE = path.join(tmp, "access.json");
  process.env.AWE_DATA_DIR = tmp;
  process.env.AWE_HOLDINGS_FILE = path.join(tmp, "holdings.json");
  process.env.AWE_PROFILES_FILE = path.join(tmp, "profiles.json");
  fs.writeFileSync(
    process.env.AWE_PROFILES_FILE,
    JSON.stringify({ version: 1, profiles: { [ALICE]: { username: "Alice" } } }),
  );

  access = await import("@oncyberio/studio/server-gating");
  access.setPrivyClient({
    utils: () => ({
      auth: () => ({
        verifyAccessToken: async (token: string) => ({ user_id: token, app_id: "test", expiration: 0, session_id: token }),
      }),
    }),
    users: () => ({ _get: async () => ({ linked_accounts: [] }) }),
  });

  const { Server } = await import("colyseus");
  const { GameRoom } = await import("../server/game-room");
  server = new Server();
  server.define("game", GameRoom);
  await server.listen(PORT);
});

afterAll(async () => {
  // Most players already left; leaving a closed room never settles.
  for (const p of open) await Promise.race([p.room.leave().catch(() => {}), sleep(300)]);
  await server?.gracefullyShutdown(false);
  const { getGateRegistry } = await import("../server/game-room");
  getGateRegistry().close();
  access?.setPrivyClient(null);
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("world chat keeps no history", () => {
  it("only shows each player what was said while they were here", async () => {
    const alice = await join(ALICE);
    const bob = await join(BOB);

    say(alice, "hi bob");
    await until(() => bob.chat.length === 1);
    await until(() => alice.chat.length === 1);
    // The name comes from the server's copy of the profile.
    expect(bob.chat[0]).toMatchObject({ channel: "world", name: "Alice", text: "hi bob", sessionId: alice.room.sessionId });

    const charlie = await join(CHARLIE);
    await sleep(150);
    expect(charlie.chat).toEqual([]);

    say(charlie, "hi too");
    await until(() => alice.chat.length === 2 && bob.chat.length === 2 && charlie.chat.length === 1);

    // Bob reloads: a new connection starts empty.
    await bob.room.leave();
    const bob2 = await join(BOB);
    await sleep(150);
    expect(bob2.chat).toEqual([]);

    say(alice, "welcome back");
    await until(() => bob2.chat.length === 1);

    expect(texts(alice)).toEqual(["hi bob", "hi too", "welcome back"]);
    expect(texts(bob2)).toEqual(["welcome back"]);
    expect(texts(charlie)).toEqual(["hi too", "welcome back"]);

    for (const p of [alice, bob2, charlie]) await p.room.leave();
  });
});

describe("room channels", () => {
  it("gives players inside a chat zone their own channel", async () => {
    const alice = await join(ALICE);
    const bob = await join(BOB);
    move(alice, OUTSIDE);
    move(bob, OUTSIDE);

    move(alice, LOUNGE);
    const entered = await until(() => alice.rooms.at(-1)?.room);
    expect(entered).toEqual({ channel: "zone:lounge", label: "Lounge" });

    say(alice, "lounge only", "zone:lounge");
    await until(() => alice.chat.some((m) => m.text === "lounge only"));
    await sleep(150);
    expect(bob.chat.some((m) => m.text === "lounge only")).toBe(false);

    // Outsiders can't post into the room.
    say(bob, "let me in", "zone:lounge");
    expect((await until(() => bob.refused[0])).error).toBe("You've left Lounge.");

    // World chat still reaches the room.
    say(bob, "hello world");
    await until(() => alice.chat.some((m) => m.text === "hello world"));

    move(alice, OUTSIDE);
    await until(() => alice.rooms.length >= 2 && alice.rooms.at(-1)!.room === null);

    await alice.room.leave();
    await bob.room.leave();
  });

  it("makes voice private to the room, at any distance inside it", async () => {
    const alice = await join(ALICE);
    const bob = await join(BOB);
    const peersOf = (p: Player) => p.voice.at(-1)?.peers ?? [];
    move(alice, OUTSIDE);
    move(bob, { x: 3, y: 0, z: 0 });
    alice.room.send(VOICE_JOIN_MESSAGE, { on: true });
    bob.room.send(VOICE_JOIN_MESSAGE, { on: true });

    // Close together outside: proximity voice, fading with distance.
    expect(await until(() => peersOf(alice)[0])).toMatchObject({ sessionId: bob.room.sessionId, inRoom: false });

    // Alice walks into the lounge: Bob, though nearby, is cut off.
    move(alice, LOUNGE);
    await until(() => alice.voice.length > 1 && peersOf(alice).length === 0);

    // Bob joins her in the lounge, at its far corner: connected again, at full volume.
    move(bob, { x: LOUNGE.x + 3.5, y: 0, z: LOUNGE.z + 3.5 });
    expect(await until(() => peersOf(bob)[0])).toMatchObject({ sessionId: alice.room.sessionId, inRoom: true });

    await alice.room.leave();
    await bob.room.leave();
  });

  it("lets a Speaker go live to everyone outside rooms in the chunk", async () => {
    const speaker = await join(SPEAKER);
    const far = await join(ALICE);
    const boxed = await join(BOB);
    const mod = await join(MOD);
    const peersOf = (p: Player) => p.voice.at(-1)?.peers ?? [];
    const isLive = () => speaker.room.state.players.get(speaker.room.sessionId)?.broadcasting;
    move(speaker, OUTSIDE);
    move(far, { x: 0, y: 0, z: 300 }); // far out of earshot, same chunk
    move(boxed, LOUNGE);
    move(mod, { x: 0, y: 0, z: -300 });
    for (const p of [speaker, far, boxed, mod]) p.room.send(VOICE_JOIN_MESSAGE, { on: true });
    await until(() => boxed.rooms.at(-1)?.room);

    // Without Broadcast Voice, going live is ignored.
    far.room.send(VOICE_BROADCAST_MESSAGE, { on: true });
    await sleep(200);
    expect(far.room.state.players.get(far.room.sessionId)?.broadcasting).toBe(false);
    expect(peersOf(speaker)).toEqual([]);

    // Live: everyone outside rooms in the chunk hears the Speaker at full volume; the lounge doesn't.
    speaker.room.send(VOICE_BROADCAST_MESSAGE, { on: true });
    await until(isLive);
    expect(await until(() => peersOf(far)[0])).toMatchObject({ sessionId: speaker.room.sessionId, live: true });
    await until(() => peersOf(speaker).length === 2);
    expect(peersOf(speaker).every((p) => !p.live)).toBe(true);
    expect(peersOf(speaker).map((p) => p.sessionId)).not.toContain(boxed.room.sessionId);
    // Listeners far from each other aren't connected to each other.
    expect(peersOf(far).map((p) => p.sessionId)).toEqual([speaker.room.sessionId]);

    // A moderator mute takes them off air.
    mod.room.send(MOD_MUTE_MESSAGE, { sessionId: speaker.room.sessionId, muted: true });
    await until(() => !isLive());
    await until(() => peersOf(far).length === 0);
    mod.room.send(MOD_MUTE_MESSAGE, { sessionId: speaker.room.sessionId, muted: false });

    // Stopping the broadcast drops the far listeners too.
    await sleep(100);
    speaker.room.send(VOICE_BROADCAST_MESSAGE, { on: true });
    await until(() => peersOf(far).length === 1);
    speaker.room.send(VOICE_BROADCAST_MESSAGE, { on: false });
    await until(() => peersOf(far).length === 0);

    for (const p of [speaker, far, boxed, mod]) await p.room.leave();
  });

  it("treats a token-gated area as a room", async () => {
    const admin = await join(ADMIN); // administrators may enter any gate
    move(admin, OUTSIDE);
    move(admin, GATE);
    expect(await until(() => admin.rooms.at(-1)?.room)).toEqual({ channel: "gate:gate-1", label: "Vault" });

    say(admin, "vault talk", "gate:gate-1");
    await until(() => admin.chat.some((m) => m.channel === "gate:gate-1" && m.text === "vault talk"));
    await admin.room.leave();
  });
});

describe("chat permissions and limits", () => {
  it("refuses players without Send Messages", async () => {
    const lurker = await join(LURKER);
    say(lurker, "can I talk?");
    expect((await until(() => lurker.refused[0])).error).toBe("You don't have permission to chat.");
    await lurker.room.leave();
  });

  it("refuses players a moderator muted", async () => {
    const mod = await join(MOD);
    const charlie = await join(CHARLIE);
    mod.room.send(MOD_MUTE_MESSAGE, { sessionId: charlie.room.sessionId, muted: true });
    await until(() => charlie.room.state.players.get(charlie.room.sessionId)?.voiceMuted);

    say(charlie, "spam");
    expect((await until(() => charlie.refused[0])).error).toBe("You're muted by a moderator.");
    await mod.room.leave();
    await charlie.room.leave();
  });

  it("rate-limits, drops empty text, cuts long text and ignores a spoofed name", async () => {
    const alice = await join(ALICE);

    say(alice, "   \u0000  ");
    alice.room.send(CHAT_SEND_MESSAGE, { channel: "world", text: "x".repeat(500), name: "Admin" });
    const long = await until(() => alice.chat[0]);
    expect(long.text).toHaveLength(300);
    expect(long.name).toBe("Alice");

    for (let i = 0; i < 6; i++) say(alice, `msg ${i}`);
    expect((await until(() => alice.refused[0])).error).toBe("Slow down.");
    await sleep(150);
    // The empty one never went out; the long one used a token, so 4 of the 6 fit.
    expect(alice.chat.map((m) => m.text).filter((t) => t.startsWith("msg"))).toEqual(["msg 0", "msg 1", "msg 2", "msg 3"]);
    await alice.room.leave();
  });
});
