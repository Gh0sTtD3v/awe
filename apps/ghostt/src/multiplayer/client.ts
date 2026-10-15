import { Client, Room } from "@colyseus/sdk";
import { GameState } from "../../shared/game-state";

let room: Room<any, GameState> | null = null;

/**
 * Join the game room. The access token identifies the player to the server,
 * which uses it to decide token-gate access; null joins anonymously.
 */
export async function connectToRoom(
  accessToken: string | null = null,
): Promise<Room<any, GameState>> {
  const client = new Client("ws://localhost:2567");
  room = await client.joinOrCreate<GameState>("game", { accessToken });
  return room;
}

export function disconnectFromRoom() {
  room?.leave();
  room = null;
}

export function getRoom(): Room<any, GameState> | null {
  return room;
}
