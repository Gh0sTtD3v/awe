"use server";

import { Patch } from "immer";
import { GameData } from "../types/game-data";
import { GameRevision, GameService } from "../server/game-service";

export async function getGameData(): Promise<GameData> {
  return GameService.getGameData();
}

export async function getGameRevision(): Promise<GameRevision> {
  return GameService.getGameRevision();
}

export async function updateGame(opts: {
  id: string;
  patches: Patch[];
}): Promise<{ success: boolean }> {
  return GameService.updateGame(opts);
}
