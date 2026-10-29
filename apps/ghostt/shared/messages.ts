import type { ScreenState } from "./screens";
import type { VoicePeer, VoiceSignal } from "./voice";

export const PLAYER_UPDATE_MESSAGE = "player:update";

export interface PlayerUpdateMessage {
  x: number;
  y: number;
  z: number;
  rotY: number;
  anim: string;
}

export function isPlayerUpdateMessage(
  value: unknown,
): value is PlayerUpdateMessage {
  return (
    value != null &&
    typeof value === "object" &&
    Number.isFinite((value as PlayerUpdateMessage).x) &&
    Number.isFinite((value as PlayerUpdateMessage).y) &&
    Number.isFinite((value as PlayerUpdateMessage).z) &&
    Number.isFinite((value as PlayerUpdateMessage).rotY) &&
    typeof (value as PlayerUpdateMessage).anim === "string"
  );
}

// ── Token gates ──────────────────────────────────────────────────────────────

/** Server → client: which gates this player may enter. */
export const GATE_ACCESS_MESSAGE = "gate:access";

export interface GateAccessMessage {
  access: Record<string, boolean>;
}

/** Server → client: a position inside a gate was refused; go to `exit`. */
export const GATE_DENIED_MESSAGE = "gate:denied";

export interface GateDeniedMessage {
  gateId: string;
  exit: { x: number; y: number; z: number };
  label: string;
  requirement: string;
}

/** Client → server: the player's sign-in changed; re-check gate access. */
export const AUTH_UPDATE_MESSAGE = "auth:update";

export interface AuthUpdateMessage {
  accessToken: string | null;
}

export function isAuthUpdateMessage(value: unknown): value is AuthUpdateMessage {
  if (value == null || typeof value !== "object") return false;
  const token = (value as AuthUpdateMessage).accessToken;
  return token === null || typeof token === "string";
}

// ── Roles & permissions ──────────────────────────────────────────────────────

/** Server → client: what this player may do, resolved from their roles. */
export const ACCESS_SELF_MESSAGE = "access:self";

export interface AccessSelfMessage {
  isOwner: boolean;
  permissions: string[];
  /** Held roles, highest first, ending with `everyone`. */
  roleIds: string[];
  /** Rank of the highest held role; see `PlayerState.rolePosition`. */
  rolePosition: number;
  /** Restricted chunks only, by key. A chunk missing here is open to all. */
  chunks: Record<string, boolean>;
  /** Set while an admin previews the world as one role; null otherwise. */
  preview: RolePreview | null;
}

/** The role an admin is previewing the world as. */
export interface RolePreview {
  roleId: string;
  name: string;
  color: string;
}

/** Server → client: a position inside a members-only chunk was refused. */
export const CHUNK_DENIED_MESSAGE = "chunk:denied";

export interface ChunkDeniedMessage {
  chunkKey: string;
  title: string;
  /** Names of the roles that may enter. */
  roles: string[];
  /** Last accepted position, if any. */
  exit: { x: number; y: number; z: number } | null;
}

/** Client → server: a moderator kicks or bans another player. */
export const MOD_KICK_MESSAGE = "mod:kick";
export const MOD_BAN_MESSAGE = "mod:ban";

export interface ModActionMessage {
  sessionId: string;
}

export function isModActionMessage(value: unknown): value is ModActionMessage {
  return value != null && typeof value === "object" && typeof (value as ModActionMessage).sessionId === "string";
}

/** Server → client: why a kick or ban was refused. */
export const MOD_RESULT_MESSAGE = "mod:result";

export interface ModResultMessage {
  ok: boolean;
  error?: string;
}

// ── Video screens ────────────────────────────────────────────────────────────

/**
 * Server → client: screen playback, by screen id. All screens on join, then
 * only the ones that changed. `serverNow` lets the client convert `at` to its
 * own clock.
 */
export const SCREEN_STATE_MESSAGE = "screen:state";

export interface ScreenStateMessage {
  screens: Record<string, ScreenState>;
  serverNow: number;
}

/**
 * Client → server: control a screen. Needs Control Screens, or access to the
 * screen's control gate (its apartment). See `parseScreenControl`.
 */
export const SCREEN_CONTROL_MESSAGE = "screen:control";

/** Client → server: the length of the video a screen loaded. Anyone may report it. */
export const SCREEN_DURATION_MESSAGE = "screen:duration";

export interface ScreenDurationMessage {
  screenId: string;
  index: number;
  /** Ad index, or -1 for the video itself. */
  ad: number;
  duration: number;
}

export function isScreenDurationMessage(value: unknown): value is ScreenDurationMessage {
  if (value == null || typeof value !== "object") return false;
  const v = value as ScreenDurationMessage;
  return typeof v.screenId === "string" && Number.isInteger(v.index) && Number.isInteger(v.ad) && Number.isFinite(v.duration);
}

/** Server → client: why a screen control was refused. */
export const SCREEN_REFUSED_MESSAGE = "screen:refused";

export interface ScreenRefusedMessage {
  screenId: string;
  error: string;
}

// ── Voice chat ───────────────────────────────────────────────────────────────

/** Server → client on join: how to reach other players. */
export const VOICE_CONFIG_MESSAGE = "voice:config";

export interface VoiceConfigMessage {
  iceServers: { urls: string | string[]; username?: string; credential?: string }[];
}

/** Client → server: the player joined or left voice chat. */
export const VOICE_JOIN_MESSAGE = "voice:join";

export interface VoiceJoinMessage {
  on: boolean;
}

export function isVoiceJoinMessage(value: unknown): value is VoiceJoinMessage {
  return value != null && typeof value === "object" && typeof (value as VoiceJoinMessage).on === "boolean";
}

/** Client → server: a player with Broadcast Voice goes live to their chunk, or stops. */
export const VOICE_BROADCAST_MESSAGE = "voice:broadcast";

export interface VoiceBroadcastMessage {
  on: boolean;
}

export function isVoiceBroadcastMessage(value: unknown): value is VoiceBroadcastMessage {
  return value != null && typeof value === "object" && typeof (value as VoiceBroadcastMessage).on === "boolean";
}

/** Server → client: the full list of players this client should be connected to. */
export const VOICE_PEERS_MESSAGE = "voice:peers";

export interface VoicePeersMessage {
  peers: VoicePeer[];
}

/**
 * WebRTC handshake, relayed by the server between connected pairs only.
 * Client → server: `{ to, signal }`. Server → client: `{ from, signal }`.
 */
export const VOICE_SIGNAL_MESSAGE = "voice:signal";

export interface VoiceSignalOut {
  to: string;
  signal: VoiceSignal;
}

export interface VoiceSignalIn {
  from: string;
  signal: VoiceSignal;
}

/** Client → server: a moderator mutes or unmutes a player in voice. Replies with `mod:result`. */
export const MOD_MUTE_MESSAGE = "mod:mute";

export interface ModMuteMessage {
  sessionId: string;
  muted: boolean;
}

export function isModMuteMessage(value: unknown): value is ModMuteMessage {
  return isModActionMessage(value) && typeof (value as ModMuteMessage).muted === "boolean";
}

// ── Text chat ────────────────────────────────────────────────────────────────

/** Longest chat message, in characters. Longer text is cut. */
export const CHAT_MAX_LENGTH = 300;

/** Client → server: say something in `world` or the room the player is in. */
export const CHAT_SEND_MESSAGE = "chat:send";

export interface ChatSendMessage {
  channel: string;
  text: string;
}

export function isChatSendMessage(value: unknown): value is ChatSendMessage {
  if (value == null || typeof value !== "object") return false;
  const { channel, text } = value as ChatSendMessage;
  return typeof channel === "string" && channel.length <= 200 && typeof text === "string" && text.length <= 2000;
}

/** Server → client: a message, sent only to players in its channel. Never stored. */
export const CHAT_MESSAGE = "chat:message";

export interface ChatMessage {
  id: number;
  channel: string;
  sessionId: string;
  /** From the sender's profile, as the server knows it. */
  name: string;
  avatar: string;
  roleColor: string;
  text: string;
  at: number;
}

/** Server → client: why a message wasn't sent. */
export const CHAT_REFUSED_MESSAGE = "chat:refused";

export interface ChatRefusedMessage {
  error: string;
}

/** Server → client: the room this player is standing in now, or null for none. */
export const CHAT_ROOM_MESSAGE = "chat:room";

export interface ChatRoomMessage {
  room: { channel: string; label: string } | null;
}

/** Control characters and invisible direction/zero-width marks. */
// eslint-disable-next-line no-control-regex
const CHAT_STRIP = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g;

/** Chat text as it is sent: control characters removed, trimmed, cut to length. */
export function cleanChatText(raw: string): string {
  return raw.replace(CHAT_STRIP, "").trim().slice(0, CHAT_MAX_LENGTH).trim();
}

/** Close codes for players removed by moderation. */
export const KICKED_CLOSE_CODE = 4001;
export const BANNED_CLOSE_CODE = 4003;

/** `rolePosition` of the owner, who outranks every role. */
export const OWNER_ROLE_POSITION = 1_000_000;
