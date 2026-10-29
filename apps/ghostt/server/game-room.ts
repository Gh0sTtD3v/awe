import { Client, Room, ServerError } from "colyseus";
import {
  AccessError,
  accessFor,
  cosmosAddressOf,
  EVERYONE_ROLE_ID,
  getAccessStore,
  getProfile,
  getProfileStore,
  getOwnerId,
  hasPermission,
  identifyAccessToken,
  previewAccess,
  identityMeetsRequirement,
  invalidateHoldings,
  setBanned,
  sortRoles,
  type AccessData,
  type GateIdentity,
  type Permission,
  type ResolvedAccess,
} from "@oncyberio/studio/server-gating";
import { posToChunkKey } from "@oncyberio/world-config";
import { GameState, PlayerState } from "../shared/game-state";
import {
  ACCESS_SELF_MESSAGE,
  AUTH_UPDATE_MESSAGE,
  BANNED_CLOSE_CODE,
  CHUNK_DENIED_MESSAGE,
  GATE_ACCESS_MESSAGE,
  GATE_DENIED_MESSAGE,
  KICKED_CLOSE_CODE,
  MOD_BAN_MESSAGE,
  MOD_KICK_MESSAGE,
  MOD_RESULT_MESSAGE,
  OWNER_ROLE_POSITION,
  isAuthUpdateMessage,
  isModActionMessage,
  isPlayerUpdateMessage,
  PLAYER_UPDATE_MESSAGE,
  SCREEN_CONTROL_MESSAGE,
  SCREEN_DURATION_MESSAGE,
  SCREEN_REFUSED_MESSAGE,
  SCREEN_STATE_MESSAGE,
  isScreenDurationMessage,
  MOD_MUTE_MESSAGE,
  VOICE_CONFIG_MESSAGE,
  VOICE_JOIN_MESSAGE,
  VOICE_BROADCAST_MESSAGE,
  VOICE_PEERS_MESSAGE,
  VOICE_SIGNAL_MESSAGE,
  isModMuteMessage,
  isVoiceJoinMessage,
  isVoiceBroadcastMessage,
  type VoicePeersMessage,
  type VoiceSignalIn,
  type AccessSelfMessage,
  type ChunkDeniedMessage,
  type GateAccessMessage,
  type GateDeniedMessage,
  type ModResultMessage,
  type ScreenRefusedMessage,
  type ScreenStateMessage,
  CHAT_MESSAGE,
  CHAT_REFUSED_MESSAGE,
  CHAT_ROOM_MESSAGE,
  CHAT_SEND_MESSAGE,
  cleanChatText,
  isChatSendMessage,
  type ChatMessage,
  type ChatRefusedMessage,
  type ChatRoomMessage,
} from "../shared/messages";
import { WORLD_CHANNEL, channelOf, zoneAt, type ZoneDef } from "../shared/zones";
import { mayControlScreen, parseScreenControl, type ScreenState } from "../shared/screens";
import { NETWORK_TICK_INTERVAL } from "../shared/network-constants";
import {
  describeRequirement,
  pointInGate,
  segmentHitsGate,
  type GateDef,
  type Vec3,
} from "../shared/gates";
import { GateRegistry, type ChunkRule } from "./gate-registry";
import { ScreenDirector } from "./screen-director";
import { VoiceDirector } from "./voice-director";
import { voiceConfigFor } from "./voice-config";
import { isVoiceSignal, type VoiceMember } from "../shared/voice";

/** How often voice connections are re-planned from player positions. */
const VOICE_UPDATE_MS = 1000;

/** Chat rate limit: a bucket of this many messages, refilled over CHAT_REFILL_MS. */
const CHAT_BURST = 5;
const CHAT_REFILL_MS = 5000;

/** Don't spam a client stuck inside a gate with denials (positions arrive at 30/s). */
const DENIED_THROTTLE_MS = 250;
/** Re-checking holdings hits the indexer; don't let a client hammer it. */
const AUTH_UPDATE_THROTTLE_MS = 5000;
/**
 * Moves longer than this are treated as teleports (portals, travel), not
 * walking, so the segment check doesn't deny a legit jump that merely flies
 * over a gate. Far above any per-tick walking distance.
 */
const MAX_WALK_STEP = 5;

interface GateSession {
  identity: GateIdentity | null;
  /** What this player's roles allow. Starts as `everyone` until resolved. */
  roles: ResolvedAccess;
  /**
   * The role this player asked to preview the world as. Honoured only while
   * their real access includes `administrator`.
   */
  previewRoleId: string | null;
  /** gateId → may enter. Missing means "not decided yet" and is denied. */
  access: Record<string, boolean>;
  lastAccepted: Vec3 | null;
  lastDeniedAt: number;
  lastAuthUpdateAt: number;
  pendingToken: string | null;
  authTimer: ReturnType<typeof setTimeout> | null;
}

type Blocker = { kind: "gate"; gate: GateDef } | { kind: "chunk"; rule: ChunkRule };

const EVERYONE_ONLY: ResolvedAccess = {
  isOwner: false,
  banned: false,
  roleIds: [EVERYONE_ROLE_ID],
  permissions: [],
  topPosition: 0,
};

let sharedRegistry: GateRegistry | null = null;

/** The process-wide gate registry, created and watched on first use. */
export function getGateRegistry(): GateRegistry {
  if (!sharedRegistry) {
    sharedRegistry = new GateRegistry();
    sharedRegistry.watch();
  }
  return sharedRegistry;
}

function rankOf(access: ResolvedAccess): number {
  return access.isOwner ? OWNER_ROLE_POSITION : access.topPosition;
}

/** A role id from join options: a short string, or null. */
function previewRoleOf(options: any): string | null {
  const id = options?.previewRole;
  return typeof id === "string" && id.length > 0 && id.length <= 64 ? id : null;
}

/**
 * What a player may do: their real access, or — for an admin previewing a
 * role — that role's alone. Bans always come from the real access.
 */
function effectiveAccess(real: ResolvedAccess, previewRoleId: string | null, data: AccessData): ResolvedAccess {
  if (real.banned || !previewRoleId || !hasPermission(real, "administrator")) return real;
  return previewAccess(previewRoleId, data);
}

export class GameRoom extends Room<{ state: GameState }> {
  state = new GameState();

  private gates = getGateRegistry();
  private sessions = new Map<string, GateSession>();
  private unsubscribers: (() => void)[] = [];
  private screens = new ScreenDirector((changed) => this.broadcast(SCREEN_STATE_MESSAGE, screenMessage(changed)));
  private voice = new VoiceDirector();
  /** Chat rooms (token gates and chat zones), and the one each player stands in. */
  private zones: ZoneDef[] = [];
  private chatRooms = new Map<string, ZoneDef | null>();
  private chatBuckets = new Map<string, { tokens: number; at: number }>();
  private chatId = 0;

  onCreate() {
    this.setPatchRate(NETWORK_TICK_INTERVAL);
    this.clock.setInterval(() => this.updateVoice(), VOICE_UPDATE_MS);
    this.screens.setDefs(this.gates.screens());
    this.zones = this.gates.zones();

    // Gates or chunk rules edited in the studio, or roles, members and bans
    // changed: re-decide access for everyone. Screens follow playlist edits.
    this.unsubscribers.push(
      this.gates.onChange(() => {
        this.screens.setDefs(this.gates.screens());
        this.zones = this.gates.zones();
        for (const client of this.clients) this.updateChatRoom(client);
        this.refreshEveryone();
      }),
    );
    this.unsubscribers.push(getAccessStore().watch(() => this.refreshEveryone()));
    this.unsubscribers.push(
      getProfileStore().watch(() => {
        for (const client of this.clients) void this.refreshProfile(client);
      }),
    );
  }

  /**
   * Anonymous players are welcome — they just can't enter gates or
   * members-only chunks. A bad token is treated as anonymous rather than
   * refused, so an expired session doesn't kick someone out of the whole game.
   * Banned accounts are refused.
   */
  async onAuth(_client: Client, options: any) {
    const identity = await identifyAccessToken(options?.accessToken ?? null);
    const previewRoleId = previewRoleOf(options);
    const [real, data] = await Promise.all([accessFor(identity), getAccessStore().read()]);
    if (real.banned) throw new ServerError(BANNED_CLOSE_CODE, "You are banned from this world.");
    return { identity, roles: effectiveAccess(real, previewRoleId, data), previewRoleId };
  }

  messages = {
    [PLAYER_UPDATE_MESSAGE]: (client: Client, payload: unknown) => {
      if (!isPlayerUpdateMessage(payload)) return;

      const player = this.state.players.get(client.sessionId);
      const session = this.sessions.get(client.sessionId);
      if (!player || !session) return;

      const blocked = this.blocker(session, payload);
      if (blocked) {
        void this.deny(client, session, blocked);
        return;
      }

      player.x = payload.x;
      player.y = payload.y;
      player.z = payload.z;
      player.rotY = payload.rotY;
      player.anim = payload.anim;
      player.updatedAt = Date.now();
      session.lastAccepted = { x: payload.x, y: payload.y, z: payload.z };
      this.updateChatRoom(client);
    },

    [AUTH_UPDATE_MESSAGE]: (client: Client, payload: unknown) => {
      if (!isAuthUpdateMessage(payload)) return;

      const session = this.sessions.get(client.sessionId);
      if (!session) return;

      // Throttled, but never dropped: a real sign-in right after joining must
      // still land. Only the latest token in a burst is processed.
      session.pendingToken = payload.accessToken;
      if (session.authTimer) return;

      const wait = Math.max(0, session.lastAuthUpdateAt + AUTH_UPDATE_THROTTLE_MS - Date.now());
      session.authTimer = setTimeout(() => {
        session.authTimer = null;
        void this.applyAuthUpdate(client, session);
      }, wait);
    },

    [MOD_KICK_MESSAGE]: (client: Client, payload: unknown) => {
      if (isModActionMessage(payload)) void this.moderate(client, payload.sessionId, "kick");
    },

    [MOD_BAN_MESSAGE]: (client: Client, payload: unknown) => {
      if (isModActionMessage(payload)) void this.moderate(client, payload.sessionId, "ban");
    },

    [SCREEN_CONTROL_MESSAGE]: (client: Client, payload: unknown) => {
      const control = parseScreenControl(payload);
      if (!control) return;

      const refuse = (error: string) =>
        client.send(SCREEN_REFUSED_MESSAGE, { screenId: control.screenId, error } satisfies ScreenRefusedMessage);

      const session = this.sessions.get(client.sessionId);
      if (!session || !this.mayControlScreen(session, control.screenId)) {
        return refuse("You can't control this screen.");
      }
      const { screenId, ...action } = control;
      const result = this.screens.control(screenId, action);
      if ("error" in result) refuse(result.error);
    },

    [VOICE_JOIN_MESSAGE]: (client: Client, payload: unknown) => {
      if (!isVoiceJoinMessage(payload)) return;
      const player = this.state.players.get(client.sessionId);
      if (!player || player.inVoice === payload.on) return;
      player.inVoice = payload.on;
      if (!payload.on) player.broadcasting = false;
      this.updateVoice();
    },

    [VOICE_BROADCAST_MESSAGE]: (client: Client, payload: unknown) => {
      if (!isVoiceBroadcastMessage(payload)) return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.broadcasting = payload.on && player.inVoice && this.canBroadcast(client.sessionId);
      this.updateVoice();
    },

    [VOICE_SIGNAL_MESSAGE]: (client: Client, payload: unknown) => {
      const { to, signal } = (payload ?? {}) as { to?: unknown; signal?: unknown };
      if (typeof to !== "string" || !isVoiceSignal(signal)) return;
      // Only between players the server paired: no reaching strangers across the map.
      if (!this.voice.connected(client.sessionId, to)) return;
      this.clients
        .find((c) => c.sessionId === to)
        ?.send(VOICE_SIGNAL_MESSAGE, { from: client.sessionId, signal } satisfies VoiceSignalIn);
    },

    [CHAT_SEND_MESSAGE]: (client: Client, payload: unknown) => {
      if (isChatSendMessage(payload)) this.sendChat(client, payload.channel, payload.text);
    },

    [MOD_MUTE_MESSAGE]: (client: Client, payload: unknown) => {
      if (isModMuteMessage(payload)) this.muteInVoice(client, payload.sessionId, payload.muted);
    },

    [SCREEN_DURATION_MESSAGE]: (_client: Client, payload: unknown) => {
      if (isScreenDurationMessage(payload)) {
        this.screens.reportDuration(payload.screenId, payload.index, payload.ad, payload.duration);
      }
    },
  };

  private async applyAuthUpdate(client: Client, session: GateSession) {
    if (this.sessions.get(client.sessionId) !== session) return;
    session.lastAuthUpdateAt = Date.now();

    session.identity = await identifyAccessToken(session.pendingToken);
    // A fresh sign-in (or a just-linked wallet) deserves a fresh lookup.
    const address = await cosmosAddressOf(session.identity, { fresh: true });
    if (address) invalidateHoldings(address);

    await Promise.all([this.refreshAccess(client), this.refreshProfile(client)]);
  }

  /** Show everyone this player's username and picture. Signed-out players have neither. */
  private async refreshProfile(client: Client) {
    const session = this.sessions.get(client.sessionId);
    const player = this.state.players.get(client.sessionId);
    if (!session || !player) return;

    let name = "";
    let avatar = "";
    if (session.identity) {
      try {
        const profile = await getProfile(session.identity.userId);
        name = profile.username ?? "";
        avatar = profile.avatarUrl ?? "";
      } catch (err) {
        console.warn("[Profiles]", (err as Error).message);
        return;
      }
    }
    if (this.sessions.get(client.sessionId) !== session) return;
    player.name = name;
    player.avatar = avatar;
  }

  async onJoin(client: Client) {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.updatedAt = Date.now();
    this.state.players.set(client.sessionId, player);

    this.sessions.set(client.sessionId, {
      identity: client.auth?.identity ?? null,
      roles: client.auth?.roles ?? EVERYONE_ONLY,
      previewRoleId: client.auth?.previewRoleId ?? null,
      access: {},
      lastAccepted: null,
      lastDeniedAt: 0,
      lastAuthUpdateAt: 0,
      pendingToken: null,
      authTimer: null,
    });

    console.log("[Server] Player joined:", client.sessionId);
    client.send(SCREEN_STATE_MESSAGE, screenMessage(this.screens.all()));
    client.send(VOICE_CONFIG_MESSAGE, voiceConfigFor(client.sessionId));
    await Promise.all([this.refreshAccess(client), this.refreshProfile(client)]);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    const session = this.sessions.get(client.sessionId);
    if (session?.authTimer) clearTimeout(session.authTimer);
    this.sessions.delete(client.sessionId);
    this.chatRooms.delete(client.sessionId);
    this.chatBuckets.delete(client.sessionId);
    this.voice.remove(client.sessionId);
    this.updateVoice();
    console.log("[Server] Player left:", client.sessionId);
  }

  onDispose() {
    this.unsubscribers.forEach((fn) => fn());
    this.screens.dispose();
    for (const session of this.sessions.values()) {
      if (session.authTimer) clearTimeout(session.authTimer);
    }
  }

  private refreshEveryone() {
    for (const client of this.clients) void this.refreshAccess(client);
  }

  /** Re-resolve roles and every gate for this client, and tell it the result. */
  private async refreshAccess(client: Client) {
    const session = this.sessions.get(client.sessionId);
    if (!session) return;

    let real: ResolvedAccess;
    let data: AccessData;
    try {
      [real, data] = await Promise.all([accessFor(session.identity), getAccessStore().read()]);
    } catch (err) {
      // Unreadable access file: keep what we had rather than unbanning anyone.
      console.warn("[Access]", (err as Error).message);
      return;
    }

    if (real.banned) {
      client.leave(BANNED_CLOSE_CODE, "You are banned from this world.");
      return;
    }
    const roles = effectiveAccess(real, session.previewRoleId, data);
    const previewing = roles !== real;
    const previewRole = previewing ? data.roles.find((r) => r.id === session.previewRoleId) : undefined;

    // Administrators pass every gate, Discord-style.
    const bypass = hasPermission(roles, "administrator");
    const gates = this.gates.all();
    const entries = await Promise.all(
      gates.map(
        async (gate) =>
          [gate.id, bypass || (await identityMeetsRequirement(session.identity, gate.requirement))] as const,
      ),
    );

    // The client may have left while holdings were being looked up.
    if (this.sessions.get(client.sessionId) !== session) return;

    session.roles = roles;
    session.access = Object.fromEntries(entries);
    this.showRole(client.sessionId, roles, data);

    client.send(GATE_ACCESS_MESSAGE, { access: session.access } satisfies GateAccessMessage);
    client.send(ACCESS_SELF_MESSAGE, {
      isOwner: roles.isOwner,
      permissions: roles.permissions,
      roleIds: roles.roleIds,
      rolePosition: rankOf(roles),
      chunks: Object.fromEntries(
        this.gates.allChunkRules().map((rule) => [rule.key, this.mayEnterChunk(roles, rule)]),
      ),
      preview: previewing
        ? {
            roleId: session.previewRoleId!,
            name: previewRole?.id === EVERYONE_ROLE_ID ? "@everyone" : (previewRole?.name ?? "@everyone"),
            color: previewRole?.color ?? "",
          }
        : null,
    } satisfies AccessSelfMessage);
  }

  /** Put the player's highest role on their public state, for the Players list. */
  private showRole(sessionId: string, roles: ResolvedAccess, data: AccessData) {
    const player = this.state.players.get(sessionId);
    if (!player) return;

    const top = roles.isOwner ? null : sortRoles(data.roles).find((r) => roles.roleIds.includes(r.id));
    player.roleId = roles.isOwner ? "owner" : (top?.id ?? EVERYONE_ROLE_ID);
    player.roleName = roles.isOwner ? "Owner" : top && top.id !== EVERYONE_ROLE_ID ? top.name : "";
    player.roleColor = roles.isOwner ? "#f5c542" : top && top.id !== EVERYONE_ROLE_ID ? top.color : "";
    player.rolePosition = rankOf(roles);
  }

  private mayEnterChunk(roles: ResolvedAccess, rule: ChunkRule): boolean {
    return hasPermission(roles, "administrator") || rule.roleIds.some((id) => roles.roleIds.includes(id));
  }

  /** The first gate or members-only chunk this move would put the player in without access. */
  private blocker(session: GateSession, to: Vec3): Blocker | null {
    const rule = this.gates.chunkRule(posToChunkKey(to));
    if (rule && !this.mayEnterChunk(session.roles, rule)) return { kind: "chunk", rule };

    const from = session.lastAccepted;
    const walked = from != null && distance(from, to) <= MAX_WALK_STEP;

    for (const gate of this.gates.all()) {
      if (session.access[gate.id] === true) continue;
      if (pointInGate(gate, to)) return { kind: "gate", gate };
      if (walked && segmentHitsGate(gate, from, to)) return { kind: "gate", gate };
    }
    return null;
  }

  private async deny(client: Client, session: GateSession, blocked: Blocker) {
    const now = Date.now();
    if (now - session.lastDeniedAt < DENIED_THROTTLE_MS) return;
    session.lastDeniedAt = now;

    if (blocked.kind === "gate") {
      const { gate } = blocked;
      client.send(GATE_DENIED_MESSAGE, {
        gateId: gate.id,
        exit: gate.exit,
        label: gate.label,
        requirement: describeRequirement(gate.requirement),
      } satisfies GateDeniedMessage);
      return;
    }

    const { rule } = blocked;
    let roles: string[] = [];
    try {
      const data = await getAccessStore().read();
      roles = sortRoles(data.roles)
        .filter((r) => rule.roleIds.includes(r.id))
        .map((r) => r.name);
    } catch {
      // The names are cosmetic; deny regardless.
    }

    client.send(CHUNK_DENIED_MESSAGE, {
      chunkKey: rule.key,
      title: rule.title,
      roles,
      exit: session.lastAccepted,
    } satisfies ChunkDeniedMessage);
  }

  /**
   * Control Screens works everywhere; a screen linked to a token gate (an
   * apartment's TV) can also be controlled by whoever may enter that gate.
   */
  private mayControlScreen(session: GateSession, screenId: string): boolean {
    const def = this.screens.def(screenId);
    if (!def) return false;
    return mayControlScreen(def.controlGate, hasPermission(session.roles, "control_screens"), session.access);
  }

  /** Re-plan voice connections and tell each client whose peer list changed. */
  private updateVoice() {
    // Rooms are private: same room only, at any distance there; nobody across a room's walls.
    // Live broadcasters also reach everyone outside rooms in their chunk.
    const members: VoiceMember[] = [];
    this.state.players.forEach((p, sessionId) => {
      if (p.broadcasting && !(p.inVoice && this.canBroadcast(sessionId))) p.broadcasting = false;
      if (!p.inVoice) return;
      const room = this.chatRooms.get(sessionId) ?? null;
      members.push({
        sessionId,
        x: p.x,
        y: p.y,
        z: p.z,
        room: room ? channelOf(room) : null,
        chunk: posToChunkKey(p),
        broadcasting: p.broadcasting,
      });
    });

    const changed = this.voice.update(members, (id) => this.canSpeak(id));
    for (const [sessionId, peers] of changed) {
      this.clients.find((c) => c.sessionId === sessionId)?.send(VOICE_PEERS_MESSAGE, { peers } satisfies VoicePeersMessage);
    }
  }

  /** Work out which chat room the player stands in, and tell them when it changes. */
  private updateChatRoom(client: Client) {
    const at = this.sessions.get(client.sessionId)?.lastAccepted;
    const zone = at ? zoneAt(this.zones, at) : null;
    const prev = this.chatRooms.get(client.sessionId) ?? null;
    if (prev && zone && channelOf(prev) === channelOf(zone) && prev.label === zone.label) return;
    if (!prev && !zone) return;

    this.chatRooms.set(client.sessionId, zone);
    client.send(CHAT_ROOM_MESSAGE, {
      room: zone ? { channel: channelOf(zone), label: zone.label } : null,
    } satisfies ChatRoomMessage);
    // Voice follows rooms too: re-pair now rather than on the next voice tick.
    if (this.state.players.get(client.sessionId)?.inVoice) this.updateVoice();
  }

  /**
   * Relay a chat message to everyone in its channel right now. Nothing is
   * kept: players who join later never see it.
   */
  private sendChat(client: Client, channel: string, raw: string) {
    const refuse = (error: string) => client.send(CHAT_REFUSED_MESSAGE, { error } satisfies ChatRefusedMessage);

    const session = this.sessions.get(client.sessionId);
    const player = this.state.players.get(client.sessionId);
    if (!session || !player) return;
    if (!hasPermission(session.roles, "send_messages")) return refuse("You don't have permission to chat.");
    if (player.voiceMuted) return refuse("You're muted by a moderator.");

    const text = cleanChatText(raw);
    if (!text) return;

    const room = this.chatRooms.get(client.sessionId) ?? null;
    if (channel !== WORLD_CHANNEL && channel !== channelOf(room)) {
      const left = this.zones.find((z) => channelOf(z) === channel);
      return refuse(left ? `You've left ${left.label}.` : "You're not in that room.");
    }

    // Token bucket: CHAT_BURST messages, refilling over CHAT_REFILL_MS.
    const now = Date.now();
    const bucket = this.chatBuckets.get(client.sessionId) ?? { tokens: CHAT_BURST, at: now };
    bucket.tokens = Math.min(CHAT_BURST, bucket.tokens + ((now - bucket.at) / CHAT_REFILL_MS) * CHAT_BURST);
    bucket.at = now;
    if (bucket.tokens < 1) {
      this.chatBuckets.set(client.sessionId, bucket);
      return refuse("Slow down.");
    }
    bucket.tokens -= 1;
    this.chatBuckets.set(client.sessionId, bucket);

    const id = client.sessionId;
    const message: ChatMessage = {
      id: ++this.chatId,
      channel,
      sessionId: id,
      name: player.name || `Guest ${id.length > 8 ? `${id.slice(0, 8)}…` : id}`,
      avatar: player.avatar,
      roleColor: player.roleColor,
      text,
      at: now,
    };

    if (channel === WORLD_CHANNEL) {
      this.broadcast(CHAT_MESSAGE, message);
      return;
    }
    for (const other of this.clients) {
      if (channelOf(this.chatRooms.get(other.sessionId) ?? null) === channel) other.send(CHAT_MESSAGE, message);
    }
  }

  /** Heard by others: has Speak and isn't muted by a moderator. Listeners enforce it. */
  private canSpeak(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    const player = this.state.players.get(sessionId);
    return !!session && !!player && !player.voiceMuted && hasPermission(session.roles, "speak");
  }

  /** May go live to their chunk: can speak, plus Broadcast Voice. */
  private canBroadcast(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return !!session && this.canSpeak(sessionId) && hasPermission(session.roles, "broadcast_voice");
  }

  /** Same rules as kicking: the permission, and a target ranked below you. */
  private muteInVoice(client: Client, targetSessionId: string, muted: boolean) {
    const reply = (msg: ModResultMessage) => client.send(MOD_RESULT_MESSAGE, msg);

    const actor = this.sessions.get(client.sessionId);
    const target = this.sessions.get(targetSessionId);
    const player = this.state.players.get(targetSessionId);
    if (!actor || !target || !player) return reply({ ok: false, error: "That player has left." });
    if (targetSessionId === client.sessionId) return reply({ ok: false, error: "You can't do that to yourself." });
    if (!hasPermission(actor.roles, "mute_members")) {
      return reply({ ok: false, error: "You need the Mute Members permission." });
    }
    if (target.roles.isOwner || rankOf(target.roles) >= rankOf(actor.roles)) {
      return reply({ ok: false, error: "Their highest role isn't below yours." });
    }

    player.voiceMuted = muted;
    this.updateVoice();
    console.log(`[Moderation] ${client.sessionId} ${muted ? "muted" : "unmuted"} ${targetSessionId}`);
    reply({ ok: true });
  }

  /**
   * Kick or ban another player. Same hierarchy as the studio: you need the
   * permission and must outrank the target; nobody can act on the owner.
   */
  private async moderate(client: Client, targetSessionId: string, action: "kick" | "ban") {
    const reply = (msg: ModResultMessage) => client.send(MOD_RESULT_MESSAGE, msg);

    const actor = this.sessions.get(client.sessionId);
    const target = this.sessions.get(targetSessionId);
    const targetClient = this.clients.find((c) => c.sessionId === targetSessionId);
    if (!actor || !target || !targetClient) return reply({ ok: false, error: "That player has left." });
    if (targetSessionId === client.sessionId) return reply({ ok: false, error: "You can't do that to yourself." });

    const permission: Permission = action === "kick" ? "kick_members" : "ban_members";
    if (!hasPermission(actor.roles, permission)) {
      return reply({ ok: false, error: `You need the ${action === "kick" ? "Kick" : "Ban"} Members permission.` });
    }
    if (target.roles.isOwner || rankOf(target.roles) >= rankOf(actor.roles)) {
      return reply({ ok: false, error: "Their highest role isn't below yours." });
    }

    if (action === "ban") {
      const subject = target.identity && !target.identity.synthetic ? target.identity.userId : null;
      if (!subject) return reply({ ok: false, error: "Guests without an account can only be kicked." });

      try {
        await getAccessStore().update((data) =>
          setBanned(data, { access: actor.roles, actorId: actor.identity?.userId ?? null, ownerId: getOwnerId() }, subject, true),
        );
      } catch (err) {
        return reply({ ok: false, error: err instanceof AccessError ? err.message : "Couldn't save the ban." });
      }
      targetClient.leave(BANNED_CLOSE_CODE, "You are banned from this world.");
    } else {
      targetClient.leave(KICKED_CLOSE_CODE, "You were removed by a moderator.");
    }

    console.log(`[Moderation] ${client.sessionId} ${action}ed ${targetSessionId}`);
    reply({ ok: true });
  }
}

function screenMessage(screens: Record<string, ScreenState>): ScreenStateMessage {
  return { screens, serverNow: Date.now() };
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
