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
  return room;
}

export function disconnectFromRoom() {
  room?.leave();
  room = null;
}

export function getRoom(): Room<any, GameState> | null {
  return room;
}
