import fs from "fs";
import path from "path";
import { applyPatches, enablePatches, Patch } from "immer";
import { GameData } from "../types/game-data";
import { DEFAULT_SCENE } from "../lib/default-game-data";
import { resolveWorkingFolder } from "./working-folder-service";

enablePatches();

const CHUNK_SIZE = 10_000;

/** Always in static file, never unloaded */
const GLOBAL_TYPES = new Set([
  "avatar", "vrm-anims",
]);

/** Singletons — defaults in static file, per-chunk overrides in presets */
const PRESET_TYPES = new Set([
  "water", "reflector", "background", "envmap",
  "lighting", "fog", "postprocessing",
]);

function getDataFilePath(workingFolder: string): string {
  return path.join(workingFolder, "data/static-scene.json");
}

function getChunksDir(workingFolder: string): string {
  return path.join(workingFolder, "data/chunks");
}

function posToChunkKey(pos: { x: number; y: number; z: number }): string {
  const h = CHUNK_SIZE / 2;
  return `${Math.floor((pos.x + h) / CHUNK_SIZE)}_${Math.floor((pos.y + h) / CHUNK_SIZE)}_${Math.floor((pos.z + h) / CHUNK_SIZE)}`;
}

function splitComponents(components: Record<string, any>) {
  const globals: Record<string, any> = {};
  const presets: Record<string, any> = {};
  const chunks: Record<string, Record<string, any>> = {};

  for (const [id, comp] of Object.entries(components)) {
    // Globals: always in static file
    if (GLOBAL_TYPES.has(comp.type)) {
      globals[id] = comp;
      continue;
    }

    // Presets: singletons stay in static but also captured for chunk overrides
    if (PRESET_TYPES.has(comp.type)) {
      globals[id] = comp;
      presets[id] = comp;
      continue;
    }

    // No position = global
    const pos = comp.position;
    if (!pos || typeof pos.x !== "number") {
      globals[id] = comp;
      continue;
    }

    // Chunk asset
    const key = posToChunkKey(pos);
    if (!chunks[key]) chunks[key] = {};
    chunks[key][id] = comp;
  }

  return { globals, presets, chunks };
}

export interface GameRevision {
  mtimeMs: number;
}

export class GameService {

  private static ensureGameDataFileSync(dataFile: string): void {
    if (fs.existsSync(dataFile)) return;
    const dir = path.dirname(dataFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const defaultData = { ...DEFAULT_SCENE, createdAt: Date.now(), updatedAt: Date.now() } as GameData;
    fs.writeFileSync(dataFile, JSON.stringify(defaultData, null, 2), "utf-8");
  }

  private static readJsonSync(filePath: string): any {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  private static writeJsonSync(filePath: string, data: any): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  private static async getDataFile(): Promise<string> {
    const workingFolder = await resolveWorkingFolder();
    const dataFile = getDataFilePath(workingFolder);
    this.ensureGameDataFileSync(dataFile);
    return dataFile;
  }

  private static readChunkSync(workingFolder: string, key: string): { presets: Record<string, any>; components: Record<string, any> } {
    const filePath = path.join(getChunksDir(workingFolder), `${key}.json`);
    if (!fs.existsSync(filePath)) return { presets: {}, components: {} };
    try {
      const data = this.readJsonSync(filePath);
      return {
        presets: data.presets ?? {},
        components: data.components ?? {},
      };
    }
    catch {
      return { presets: {}, components: {} };
    }
  }

  private static writeChunkSync(
    workingFolder: string,
    key: string,
    presets: Record<string, any>,
    components: Record<string, any>,
  ): void {
    const filePath = path.join(getChunksDir(workingFolder), `${key}.json`);
    if (Object.keys(components).length === 0 && Object.keys(presets).length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }
    this.writeJsonSync(filePath, { id: key, presets, components });
  }

  /**
   * Auto-generate chunk files from the full scene data.
   */
  private static generateChunkFiles(workingFolder: string, gameData: GameData): void {
    const chunksDir = getChunksDir(workingFolder);
    if (!fs.existsSync(chunksDir)) fs.mkdirSync(chunksDir, { recursive: true });

    // Clean existing
    const existing = fs.readdirSync(chunksDir);
    for (const file of existing) {
      if (file.endsWith(".json")) fs.unlinkSync(path.join(chunksDir, file));
    }

    const { presets, chunks } = splitComponents(gameData.components ?? {});

    // Each chunk gets the current preset values + its own assets
    for (const [key, chunkComponents] of Object.entries(chunks)) {
      this.writeChunkSync(workingFolder, key, presets, chunkComponents);
    }

    // If there are presets but no chunks with assets, still write a default chunk
    if (Object.keys(chunks).length === 0 && Object.keys(presets).length > 0) {
      this.writeChunkSync(workingFolder, "0_0_0", presets, {});
    }

    console.log(`Generated ${Object.keys(chunks).length} chunk file(s)`);
  }

  static async getGameData(chunkKey?: string): Promise<GameData> {
    const dataFile = await this.getDataFile();
    const fullData = this.readJsonSync(dataFile) as GameData;

    if (!chunkKey) return fullData;

    const workingFolder = path.dirname(path.dirname(dataFile));
    const chunksDir = getChunksDir(workingFolder);

    if (!fs.existsSync(chunksDir)) return fullData;

    // Build globals: GLOBAL_TYPES + PRESET_TYPES + anything without position
    const globalComponents: Record<string, any> = {};
    for (const [id, comp] of Object.entries(fullData.components ?? {})) {
      if (
        GLOBAL_TYPES.has(comp.type) ||
        PRESET_TYPES.has(comp.type) ||
        !comp.position ||
        typeof comp.position?.x !== "number"
      ) {
        globalComponents[id] = comp;
      }
    }

    const chunk = this.readChunkSync(workingFolder, chunkKey);

    return {
      ...fullData,
      components: { ...globalComponents, ...chunk.components },
      _chunkKey: chunkKey,
    } as GameData & { _chunkKey: string };
  }

  static async getGameRevision(): Promise<GameRevision> {
    const dataFile = await this.getDataFile();
    const stat = fs.statSync(dataFile);
    return { mtimeMs: stat.mtimeMs };
  }

  static async updateGame(opts: {
    id: string;
    patches: Patch[];
    chunkKey?: string;
  }): Promise<{ success: boolean }> {
    const dataFile = await this.getDataFile();
    const gameData = this.readJsonSync(dataFile);

    const patchedData = applyPatches(gameData, opts.patches);
    const updatedData = { ...patchedData, updatedAt: Date.now() };

    this.writeJsonSync(dataFile, updatedData);

    // Auto-generate chunk files
    const workingFolder = path.dirname(path.dirname(dataFile));
    this.generateChunkFiles(workingFolder, updatedData);

    return { success: true };
  }

  static async switchChunk(targetKey: string): Promise<GameData> {
    return this.getGameData(targetKey);
  }

  static async listChunks(): Promise<string[]> {
    const workingFolder = await resolveWorkingFolder();
    const chunksDir = getChunksDir(workingFolder);
    if (!fs.existsSync(chunksDir)) return [];
    return fs.readdirSync(chunksDir)
      .filter(f => f.endsWith(".json"))
      .map(f => f.replace(".json", ""));
  }
}
