import { Client, Room, ServerError } from "colyseus";
import {
  AccessError,
  accessFor,
  cosmosAddressOf,
  EVERYONE_ROLE_ID,
  getAccessStore,
  getOwnerId,
  hasPermission,
  identifyAccessToken,
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
  VOICE_PEERS_MESSAGE,
  VOICE_SIGNAL_MESSAGE,
  isModMuteMessage,
  isVoiceJoinMessage,
  type VoicePeersMessage,
  type VoiceSignalIn,
  type AccessSelfMessage,
  type ChunkDeniedMessage,
  type GateAccessMessage,
  type GateDeniedMessage,
  type ModResultMessage,
  type ScreenRefusedMessage,
  type ScreenStateMessage,
} from "../shared/messages";
import { parseScreenControl, type ScreenState } from "../shared/screens";
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
import { isVoiceSignal } from "../shared/voice";

/** How often voice connections are re-planned from player positions. */
const VOICE_UPDATE_MS = 1000;

/** Don't spam a client stuck inside a gate with denials. */
const DENIED_THROTTLE_MS = 1000;
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

export class GameRoom extends Room<{ state: GameState }> {
  state = new GameState();

  private gates = getGateRegistry();
  private sessions = new Map<string, GateSession>();
  private unsubscribers: (() => void)[] = [];
  private screens = new ScreenDirector((changed) => this.broadcast(SCREEN_STATE_MESSAGE, screenMessage(changed)));
  private voice = new VoiceDirector();

  onCreate() {
    this.setPatchRate(NETWORK_TICK_INTERVAL);
    this.clock.setInterval(() => this.updateVoice(), VOICE_UPDATE_MS);
    this.screens.setDefs(this.gates.screens());

    // Gates or chunk rules edited in the studio, or roles, members and bans
    // changed: re-decide access for everyone. Screens follow playlist edits.
    this.unsubscribers.push(
      this.gates.onChange(() => {
        this.screens.setDefs(this.gates.screens());
        this.refreshEveryone();
      }),
    );
    this.unsubscribers.push(getAccessStore().watch(() => this.refreshEveryone()));
  }

  /**
   * Anonymous players are welcome — they just can't enter gates or
   * members-only chunks. A bad token is treated as anonymous rather than
   * refused, so an expired session doesn't kick someone out of the whole game.
   * Banned accounts are refused.
   */
  async onAuth(_client: Client, options: any) {
    const identity = await identifyAccessToken(options?.accessToken ?? null);
    const roles = await accessFor(identity);
    if (roles.banned) throw new ServerError(BANNED_CLOSE_CODE, "You are banned from this world.");
    return { identity, roles };
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
      if (!session || !hasPermission(session.roles, "control_screens")) {
        return refuse("You need the Control Screens permission.");
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

    [MOD_MUTE_MESSAGE]: (client: Client, payload: unknown) => {
      if (isModMuteMessage(payload)) this.muteInVoice(client, payload.sessionId, payload.muted);
    },

    [SCREEN_DURATION_MESSAGE]: (_client: Client, payload: unknown) => {
      if (isScreenDurationMessage(payload)) {
        this.screens.reportDuration(payload.screenId, payload.index, payload.duration);
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

    await this.refreshAccess(client);
  }

  async onJoin(client: Client) {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.updatedAt = Date.now();
    this.state.players.set(client.sessionId, player);

    this.sessions.set(client.sessionId, {
      identity: client.auth?.identity ?? null,
      roles: client.auth?.roles ?? EVERYONE_ONLY,
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
    await this.refreshAccess(client);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    const session = this.sessions.get(client.sessionId);
    if (session?.authTimer) clearTimeout(session.authTimer);
    this.sessions.delete(client.sessionId);
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

    let roles: ResolvedAccess;
    let data: AccessData;
    try {
      [roles, data] = await Promise.all([accessFor(session.identity), getAccessStore().read()]);
    } catch (err) {
      // Unreadable access file: keep what we had rather than unbanning anyone.
      console.warn("[Access]", (err as Error).message);
      return;
    }

    if (roles.banned) {
      client.leave(BANNED_CLOSE_CODE, "You are banned from this world.");
      return;
    }

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

  /** Re-plan voice connections and tell each client whose peer list changed. */
  private updateVoice() {
    const members: { sessionId: string; x: number; y: number; z: number }[] = [];
    this.state.players.forEach((p, sessionId) => {
      if (p.inVoice) members.push({ sessionId, x: p.x, y: p.y, z: p.z });
    });

    const changed = this.voice.update(members, (id) => this.canSpeak(id));
    for (const [sessionId, peers] of changed) {
      this.clients.find((c) => c.sessionId === sessionId)?.send(VOICE_PEERS_MESSAGE, { peers } satisfies VoicePeersMessage);
    }
  }

  /** Heard by others: has Speak and isn't muted by a moderator. Listeners enforce it. */
  private canSpeak(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    const player = this.state.players.get(sessionId);
    return !!session && !!player && !player.voiceMuted && hasPermission(session.roles, "speak");
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
