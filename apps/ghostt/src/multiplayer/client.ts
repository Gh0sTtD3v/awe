import { Client, Room } from "@colyseus/sdk";
import { GameState } from "../../shared/game-state";

let room: Room<any, GameState> | null = null;

/**
 * `NEXT_PUBLIC_GAME_SERVER_URL` when set (e.g. wss://game.example.com behind a
 * TLS proxy); otherwise port 2567 on the host serving the page.
 */
function gameServerUrl(): string {
  const configured = process.env.NEXT_PUBLIC_GAME_SERVER_URL?.trim();
  if (configured) return configured;
  const secure = window.location.protocol === "https:";
  return `${secure ? "wss" : "ws"}://${window.location.hostname}:2567`;
}

/**
 * Join the game room. The access token identifies the player to the server,
 * which uses it to decide token-gate access; null joins anonymously.
 * `previewRole` asks to play as that role only — the server honours it for
 * admins and ignores it for everyone else.
 */
export async function connectToRoom(
  accessToken: string | null = null,
  previewRole: string | null = null,
): Promise<Room<any, GameState>> {
  const client = new Client(gameServerUrl());
  room = await client.joinOrCreate<GameState>("game", { accessToken, ...(previewRole ? { previewRole } : {}) });
  guardReconnection(room);
  return room;
}

/**
 * Work around a Colyseus SDK (0.17) reconnection race. On a flaky link a
 * late close event from an earlier socket can start a second retry chain
 * after the first one already got back in. That chain keeps retrying with a
 * stale token, gives up with 4003 (FAILED_TO_RECONNECT), and the SDK then
 * treats the room as left: it clears every message and state listener while
 * the real connection is fine. The game shows "Disconnected" yet you can
 * still move, but other players, chat and screens silently stop updating.
 *
 * While the live connection is open, ignore drops and retries.
 */
function guardReconnection(r: Room<any, GameState>) {
  const room = r as any;
  const isOpen = () => !!room.connection?.isOpen;

  const handleReconnection = room.handleReconnection?.bind(room);
  const retryReconnection = room.retryReconnection?.bind(room);
  if (!handleReconnection || !retryReconnection) return; // SDK changed: nothing to patch

  room.handleReconnection = () => {
    if (isOpen()) {
      console.info("[MP] Ignoring a stale connection drop: the connection is open.");
      room.reconnection.isReconnecting = false;
      return;
    }
    handleReconnection();
  };
  room.retryReconnection = () => {
    if (isOpen()) {
      // Already back in (another attempt succeeded): stop this chain.
      room.reconnection.isReconnecting = false;
      return;
    }
    retryReconnection();
  };

  // The root of it: a close event that arrives while the live socket is open
  // belongs to an old socket. Drop it before the SDK sees it, or it will
  // treat the room as dropped or left (and wipe every listener: voice peers,
  // chat, other players).
  const events = room.connection?.events;
  const onclose = events?.onclose;
  if (events && typeof onclose === "function") {
    events.onclose = (e: { code?: number; reason?: string }) => {
      // 4010 (MAY_TRY_RECONNECT): the SDK closing the live socket itself (the
      // browser went offline). It fires this before the socket shuts, so the
      // socket still reads as open; it must go through.
      if (e?.code !== 4010 && isOpen()) {
        console.info(`[MP] Ignoring close (code ${e?.code}) from an old socket: the connection is open.`);
        return;
      }
      onclose(e);
    };
  }

  // A retry already scheduled must not replace a socket that is open again.
  const connection = room.connection;
  const reconnect = connection?.reconnect?.bind(connection);
  if (connection && reconnect) {
    connection.reconnect = (params: unknown) => {
      if (isOpen()) {
        room.reconnection.isReconnecting = false;
        return;
      }
      reconnect(params);
    };
  }
}

/** Is the room's live socket open right now? */
export function isRoomConnected(r: Room<any, GameState> | null): boolean {
  return !!(r as any)?.connection?.isOpen;
}

export function disconnectFromRoom() {
  room?.leave();
  room = null;
}

export function getRoom(): Room<any, GameState> | null {
  return room;
}
