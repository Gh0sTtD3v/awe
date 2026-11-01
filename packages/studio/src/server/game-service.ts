import fs from "fs";
import path from "path";
import { applyPatches, enablePatches, Patch } from "immer";
import { GameData } from "../types/game-data";
import { DEFAULT_SCENE } from "../lib/default-game-data";
import { resolveWorkingFolder } from "./working-folder-service";
import {
  isGlobalComponent,
  isGlobalType,
  isPresetType,
  posToChunkKey,
} from "@oncyberio/world-config";

enablePatches();

function getDataFilePath(workingFolder: string): string {
  return path.join(workingFolder, "data/static-scene.json");
}

function getChunksDir(workingFolder: string): string {
  return path.join(workingFolder, "data/chunks");
}

function getPortalsIndexPath(workingFolder: string): string {
  return path.join(workingFolder, "data/portals-index.json");
}

function getChunkConfigPath(workingFolder: string): string {
  return path.join(workingFolder, "data/chunk-config.json");
}

function getPlotsIndexPath(workingFolder: string): string {
  return path.join(workingFolder, "data/plots-index.json");
}

/**
 * Self-describing metadata stored in each chunk file. Surfaced live in the
 * in-game info UI. Extensible — add fields here as the game grows.
 */
export interface ChunkInfo {
  title: string;
  /** Unique, URL-safe name used in `?plot=` links. */
  slug?: string;
  owner?: string;
  tags?: string[];
  image?: string;
  description?: string;
  [key: string]: unknown;
}

/** Per-chunk authoring config (source of truth, embedded into chunk files). */
export interface ChunkConfig {
  info: ChunkInfo;
  /** Role ids permitted to enter this chunk. Empty = public. */
  auth: string[];
}

/** Roles and members live in the access store, outside public/. */
export type { Role } from "./access/types";

function defaultChunkInfo(): ChunkInfo {
  return { title: "Info" };
}

function defaultChunkConfig(): ChunkConfig {
  return { info: defaultChunkInfo(), auth: [] };
}

/**
 * Lowercase letters, digits and dashes only. No underscores, so a slug can
 * never be mistaken for a chunk key like `0_0_-1`.
 */
export function normalizeSlug(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** One entry per chunk that has a slug, so `?plot=<slug>` links can be resolved. */
export interface PlotIndexEntry {
  key: string;
  slug: string;
}

/**
 * The studio image-upload control stores an upload descriptor object
 * (`{ path, image, ... }`), while presets/manual entry may use a plain string.
 * Resolve either form down to a usable URL for the portal index.
 */
function resolveImageUrl(image: any): string {
  if (!image) return "";
  if (typeof image === "string") return image;
  return image.path ?? image.image ?? "";
}

/** One entry per portal/spawnpoint in the multiverse directory ("yellowpages"). */
export interface PortalIndexEntry {
  id: string;
  name: string;
  slug: string;
  image: string;
  position: { x: number; y: number; z: number };
  chunkKey: string;
}

function splitComponents(components: Record<string, any>) {
  const globals: Record<string, any> = {};
  const presets: Record<string, any> = {};
  const chunks: Record<string, Record<string, any>> = {};

  for (const [id, comp] of Object.entries(components)) {
    // Globals: always in static file
    if (isGlobalType(comp.type)) {
      globals[id] = comp;
      continue;
    }

    // Presets: singletons stay in static and are the per-chunk override base
    if (isPresetType(comp.type)) {
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

  private static readChunkSync(workingFolder: string, key: string): { presets: Record<string, any>; assets: Record<string, any>; auth: any[]; info: ChunkInfo } {
    const filePath = path.join(getChunksDir(workingFolder), `${key}.json`);
    if (!fs.existsSync(filePath)) return { presets: {}, assets: {}, auth: [], info: defaultChunkInfo() };
    try {
      const data = this.readJsonSync(filePath);
      return {
        presets: data.presets ?? {},
        // Back-compat: older chunk files used `components`
        assets: data.assets ?? data.components ?? {},
        auth: data.auth ?? [],
        info: { ...defaultChunkInfo(), ...(data.info ?? {}) },
      };
    }
    catch {
      return { presets: {}, assets: {}, auth: [], info: defaultChunkInfo() };
    }
  }

  private static writeChunkSync(
    workingFolder: string,
    key: string,
    presets: Record<string, any>,
    assets: Record<string, any>,
    config: ChunkConfig,
  ): void {
    const filePath = path.join(getChunksDir(workingFolder), `${key}.json`);
    if (Object.keys(assets).length === 0 && Object.keys(presets).length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }
    // `info` is self-describing chunk metadata; `auth` is the list of role ids
    // permitted to enter. Both are authored via the studio config panel and
    // embedded here so the runtime reads them straight from the chunk file.
    this.writeJsonSync(filePath, {
      id: key,
      presets,
      assets,
      auth: config.auth,
      info: config.info,
    });
  }

  // ── Per-chunk config (source of truth, embedded into chunk files) ──

  private static readChunkConfigMap(workingFolder: string): Record<string, ChunkConfig> {
    const filePath = getChunkConfigPath(workingFolder);
    if (!fs.existsSync(filePath)) return {};
    try {
      return this.readJsonSync(filePath) as Record<string, ChunkConfig>;
    }
    catch {
      return {};
    }
  }

  private static configForKey(map: Record<string, ChunkConfig>, key: string): ChunkConfig {
    const c = map[key];
    if (!c) return defaultChunkConfig();
    return {
      info: { ...defaultChunkInfo(), ...(c.info ?? {}) },
      auth: Array.isArray(c.auth) ? c.auth : [],
    };
  }

  /**
   * Assemble the whole world from disk: globals from `static-scene.json` plus
   * every chunk file's assets. Server side only (studio); players only ever
   * download the globals and the chunk they're in.
   *
   * Chunk content lives only in the chunk files. A `static-scene.json` from
   * before the split still holds every component; those chunk components are
   * ignored when chunk files exist (they were generated from it), so a chunk
   * file deleted by hand stays deleted.
   */
  private static readWorldSync(workingFolder: string, dataFile: string): GameData {
    const scene = this.readJsonSync(dataFile) as GameData;
    const sceneComponents = scene.components ?? {};
    const keys = this.chunkKeysSync(workingFolder);

    const components: Record<string, any> = {};
    for (const [id, comp] of Object.entries(sceneComponents)) {
      if (keys.length === 0 || isGlobalComponent(comp)) components[id] = comp;
    }
    for (const key of keys) {
      Object.assign(components, this.readChunkSync(workingFolder, key).assets);
    }

    return { ...scene, components } as GameData;
  }

  private static chunkKeysSync(workingFolder: string): string[] {
    const chunksDir = getChunksDir(workingFolder);
    if (!fs.existsSync(chunksDir)) return [];
    return fs.readdirSync(chunksDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
  }

  /**
   * Save the whole world split up: chunk files first (each with its assets),
   * then `static-scene.json` with the globals only.
   */
  private static writeWorldSync(workingFolder: string, dataFile: string, world: GameData): void {
    this.generateChunkFiles(workingFolder, world);
    const globals: Record<string, any> = {};
    for (const [id, comp] of Object.entries(world.components ?? {})) {
      if (isGlobalComponent(comp)) globals[id] = comp;
    }
    this.writeJsonSync(dataFile, { ...world, components: globals });
  }

  /**
   * Write one file per chunk from the whole world, embedding each chunk's
   * authored config (info + auth) from `chunk-config.json`.
   */
  private static generateChunkFiles(workingFolder: string, gameData: GameData): void {
    const chunksDir = getChunksDir(workingFolder);
    if (!fs.existsSync(chunksDir)) fs.mkdirSync(chunksDir, { recursive: true });

    const configMap = this.readChunkConfigMap(workingFolder);
    const { presets, chunks } = splitComponents(gameData.components ?? {});

    const written = new Set<string>();
    for (const [key, chunkComponents] of Object.entries(chunks)) {
      this.writeChunkSync(workingFolder, key, presets, chunkComponents, this.configForKey(configMap, key));
      written.add(key);
    }

    // If there are presets but no chunks with assets, still write a default chunk
    if (Object.keys(chunks).length === 0 && Object.keys(presets).length > 0) {
      this.writeChunkSync(workingFolder, "0_0_0", presets, {}, this.configForKey(configMap, "0_0_0"));
      written.add("0_0_0");
    }

    // Only now drop chunks that no longer have anything in them, so a failed
    // write never leaves a chunk without its file.
    for (const key of this.chunkKeysSync(workingFolder)) {
      if (!written.has(key)) fs.unlinkSync(path.join(chunksDir, `${key}.json`));
    }

    this.generatePortalsIndex(workingFolder, gameData);
    this.generatePlotsIndex(workingFolder, configMap);

    console.log(`Generated ${Object.keys(chunks).length} chunk file(s)`);
  }

  /**
   * Build the flat portal directory ("yellowpages") from the full scene.
   * Written behind {@link getPortalsIndex} so the backing store can later be
   * swapped for a database without the UI knowing.
   */
  private static generatePortalsIndex(workingFolder: string, gameData: GameData): void {
    const entries: PortalIndexEntry[] = [];

    for (const [id, comp] of Object.entries(gameData.components ?? {})) {
      if (comp.type !== "portal") continue;
      const pos = comp.position ?? { x: 0, y: 0, z: 0 };
      entries.push({
        id,
        name: comp.p_name || comp.name || "Portal",
        slug: comp.slug ?? "",
        image: resolveImageUrl(comp.image),
        position: { x: pos.x ?? 0, y: pos.y ?? 0, z: pos.z ?? 0 },
        chunkKey: posToChunkKey(pos),
      });
    }

    const filePath = getPortalsIndexPath(workingFolder);
    if (entries.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }
    this.writeJsonSync(filePath, entries);
  }

  /** Write the slug -> chunk key lookup used by `?plot=` links. */
  private static generatePlotsIndex(workingFolder: string, configMap: Record<string, ChunkConfig>): void {
    const entries: PlotIndexEntry[] = [];
    for (const [key, config] of Object.entries(configMap)) {
      const slug = normalizeSlug(config?.info?.slug);
      if (slug) entries.push({ key, slug });
    }

    const filePath = getPlotsIndexPath(workingFolder);
    if (entries.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }
    this.writeJsonSync(filePath, entries);
  }

  /**
   * Read the multiverse portal directory. Returns an empty array when no
   * portals exist.
   */
  static async getPortalsIndex(): Promise<PortalIndexEntry[]> {
    const dataFile = await this.getDataFile();
    const workingFolder = path.dirname(path.dirname(dataFile));
    const filePath = getPortalsIndexPath(workingFolder);
    if (!fs.existsSync(filePath)) return [];
    try {
      return this.readJsonSync(filePath) as PortalIndexEntry[];
    }
    catch {
      return [];
    }
  }

  // ── Chunk config + roles (studio config panel) ──

  static async getChunkConfig(key: string): Promise<ChunkConfig> {
    const dataFile = await this.getDataFile();
    const workingFolder = path.dirname(path.dirname(dataFile));
    return this.configForKey(this.readChunkConfigMap(workingFolder), key);
  }

  static async setChunkConfig(key: string, config: ChunkConfig): Promise<{ success: boolean; error?: string }> {
    const dataFile = await this.getDataFile();
    const workingFolder = path.dirname(path.dirname(dataFile));

    const map = this.readChunkConfigMap(workingFolder);

    const info: ChunkInfo = { ...defaultChunkInfo(), ...(config.info ?? {}) };
    const slug = normalizeSlug(info.slug);
    if (slug) {
      const taken = Object.entries(map).find(
        ([other, c]) => other !== key && normalizeSlug(c?.info?.slug) === slug,
      );
      if (taken) return { success: false, error: `That slug is already used by plot ${taken[0]}.` };
      info.slug = slug;
    }
    else {
      delete info.slug;
    }

    map[key] = {
      info,
      auth: Array.isArray(config.auth) ? config.auth : [],
    };
    this.writeJsonSync(getChunkConfigPath(workingFolder), map);

    // Re-embed into the chunk files so the runtime picks it up immediately.
    this.generateChunkFiles(workingFolder, this.readWorldSync(workingFolder, dataFile));

    return { success: true };
  }

  /**
   * Delete a plot: every component placed in it (portals included) is removed
   * from the scene, and its config (title, slug, access) is dropped. Chunk
   * files and the portal/plot indexes are rebuilt from what's left.
   */
  static async deleteChunk(key: string): Promise<{ success: boolean; removed: number }> {
    const dataFile = await this.getDataFile();
    const workingFolder = path.dirname(path.dirname(dataFile));

    const gameData = this.readWorldSync(workingFolder, dataFile);
    const components: Record<string, any> = {};
    let removed = 0;
    for (const [id, comp] of Object.entries(gameData.components ?? {})) {
      if (!isGlobalComponent(comp) && posToChunkKey(comp.position) === key) {
        removed++;
        continue;
      }
      components[id] = comp;
    }
    const updatedData = { ...gameData, components, updatedAt: Date.now() };

    const map = this.readChunkConfigMap(workingFolder);
    if (key in map) {
      delete map[key];
      this.writeJsonSync(getChunkConfigPath(workingFolder), map);
    }

    this.writeWorldSync(workingFolder, dataFile, updatedData);

    return { success: true, removed };
  }

  /** Drop a deleted role from every chunk's access list. */
  static async removeRoleFromChunks(roleId: string): Promise<void> {
    const dataFile = await this.getDataFile();
    const workingFolder = path.dirname(path.dirname(dataFile));

    const map = this.readChunkConfigMap(workingFolder);
    let changed = false;
    for (const config of Object.values(map)) {
      if (Array.isArray(config.auth) && config.auth.includes(roleId)) {
        config.auth = config.auth.filter((id) => id !== roleId);
        changed = true;
      }
    }
    if (!changed) return;

    this.writeJsonSync(getChunkConfigPath(workingFolder), map);
    this.generateChunkFiles(workingFolder, this.readWorldSync(workingFolder, dataFile));
  }

  static async getGameData(chunkKey?: string): Promise<GameData> {
    const dataFile = await this.getDataFile();
    const workingFolder = path.dirname(path.dirname(dataFile));

    // The studio works one chunk at a time, like the game. The whole world is
    // only assembled when there's no chunk to scope to.
    if (!chunkKey || !fs.existsSync(getChunksDir(workingFolder))) {
      return this.readWorldSync(workingFolder, dataFile);
    }

    // Build globals: GLOBAL_TYPES + PRESET_TYPES + anything without position
    const scene = this.readJsonSync(dataFile) as GameData;
    const globalComponents: Record<string, any> = {};
    for (const [id, comp] of Object.entries(scene.components ?? {})) {
      if (isGlobalComponent(comp)) {
        globalComponents[id] = comp;
      }
    }

    const chunk = this.readChunkSync(workingFolder, chunkKey);

    return {
      ...scene,
      components: { ...globalComponents, ...chunk.assets },
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
    const workingFolder = path.dirname(path.dirname(dataFile));
    const gameData = this.readWorldSync(workingFolder, dataFile);

    const patchedData = applyPatches(gameData, opts.patches);
    const updatedData = { ...patchedData, updatedAt: Date.now() };

    // Chunk components go to their chunk files; static-scene.json keeps the globals.
    this.writeWorldSync(workingFolder, dataFile, updatedData);

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
