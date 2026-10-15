import type { ScreenState } from "./screens";

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

/** Client → server: control a screen (needs Control Screens). See `parseScreenControl`. */
export const SCREEN_CONTROL_MESSAGE = "screen:control";

/** Client → server: the length of the video a screen loaded. Anyone may report it. */
export const SCREEN_DURATION_MESSAGE = "screen:duration";

export interface ScreenDurationMessage {
  screenId: string;
  index: number;
  duration: number;
}

export function isScreenDurationMessage(value: unknown): value is ScreenDurationMessage {
  if (value == null || typeof value !== "object") return false;
  const v = value as ScreenDurationMessage;
  return typeof v.screenId === "string" && Number.isInteger(v.index) && Number.isFinite(v.duration);
}

/** Server → client: why a screen control was refused. */
export const SCREEN_REFUSED_MESSAGE = "screen:refused";

export interface ScreenRefusedMessage {
  screenId: string;
  error: string;
}

/** Close codes for players removed by moderation. */
export const KICKED_CLOSE_CODE = 4001;
export const BANNED_CLOSE_CODE = 4003;

/** `rolePosition` of the owner, who outranks every role. */
export const OWNER_ROLE_POSITION = 1_000_000;
