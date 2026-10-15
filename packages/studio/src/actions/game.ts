"use server";

import { Patch } from "immer";
import { GameData } from "../types/game-data";
import {
  GameRevision,
  GameService,
  type ChunkConfig,
} from "../server/game-service";
import { getAccessStore, requirePermission } from "../server/access";

// Reads stay open — the scene is served from public/ anyway. Every write
// checks the caller's permission first.

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
  await requirePermission("build");
  return GameService.updateGame(opts);
}

export async function switchChunk(targetKey: string): Promise<GameData> {
  return GameService.switchChunk(targetKey);
}

export async function listChunks(): Promise<string[]> {
  return GameService.listChunks();
}

export async function getChunkConfig(key: string): Promise<ChunkConfig> {
  return GameService.getChunkConfig(key);
}

export async function setChunkConfig(
  key: string,
  config: ChunkConfig,
): Promise<{ success: boolean }> {
  await requirePermission("manage_world");

  // Only real roles can guard a chunk.
  const roleIds = new Set((await getAccessStore().read()).roles.map((r) => r.id));
  const auth = (Array.isArray(config?.auth) ? config.auth : []).filter((id) => roleIds.has(id));

  return GameService.setChunkConfig(key, { ...config, auth });
}
