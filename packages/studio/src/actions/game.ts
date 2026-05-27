"use server";

import { Patch } from "immer";
import { GameData } from "../types/game-data";
import { GameRevision, GameService } from "../server/game-service";

export async function getGameData(chunkKey?: string): Promise<GameData> {
  return GameService.getGameData(chunkKey);
}

export async function getGameRevision(): Promise<GameRevision> {
  return GameService.getGameRevision();
}

export async function updateGame(opts: {
  id: string;
  patches: Patch[];
  chunkKey?: string;
}): Promise<{ success: boolean }> {
  return GameService.updateGame(opts);
}

export async function switchChunk(targetKey: string): Promise<GameData> {
  return GameService.switchChunk(targetKey);
}

export async function listChunks(): Promise<string[]> {
  return GameService.listChunks();
}
