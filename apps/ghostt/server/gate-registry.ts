import fs from "node:fs";
import path from "node:path";
import { gateFromComponent, pointInGate, type GateDef } from "../shared/gates";
import { screenFromComponent, type ScreenDef } from "../shared/screens";

/**
 * Every token gate, members-only chunk and video screen in the world, read straight from the
 * scene files the studio writes — the server never loads the engine. Reloads
 * when those files change, so edits in the studio apply without a restart.
 */

export function getDataDir(): string {
  return process.env.AWE_DATA_DIR || path.join(process.cwd(), "public", "data");
}

/** Every component in `static-scene.json` and `chunks/*.json` under `dataDir`. */
function eachComponent(dataDir: string, visit: (component: unknown) => void) {
  const collect = (components: unknown) => {
    if (!components || typeof components !== "object") return;
    for (const component of Object.values(components as Record<string, unknown>)) visit(component);
  };

  const scene = readJson(path.join(dataDir, "static-scene.json"));
  collect(scene?.components);

  const chunksDir = path.join(dataDir, "chunks");
  if (fs.existsSync(chunksDir)) {
    for (const file of fs.readdirSync(chunksDir)) {
      if (!file.endsWith(".json")) continue;
      collect(readJson(path.join(chunksDir, file))?.assets);
    }
  }
}

/** All gates found in `static-scene.json` and `chunks/*.json` under `dataDir`. */
export function loadGates(dataDir = getDataDir()): GateDef[] {
  const byId = new Map<string, GateDef>();
  eachComponent(dataDir, (component) => {
    const gate = gateFromComponent(component);
    if (gate) byId.set(gate.id, gate);
  });

  const gates = [...byId.values()];
  warnAboutBadExits(gates);
  return gates;
}

/** All video screens, by id. */
export function loadScreens(dataDir = getDataDir()): Map<string, ScreenDef> {
  const byId = new Map<string, ScreenDef>();
  eachComponent(dataDir, (component) => {
    const screen = screenFromComponent(component);
    if (screen) byId.set(screen.id, screen);
  });
  return byId;
}

/** A chunk only players holding one of `roleIds` may enter. */
export interface ChunkRule {
  key: string;
  roleIds: string[];
  title: string;
}

/**
 * Chunk access lists from `chunk-config.json` (the studio's source of truth)
 * and the copies embedded in chunk files. Chunks with an empty list are public
 * and left out.
 */
export function loadChunkRules(dataDir = getDataDir()): Map<string, ChunkRule> {
  const rules = new Map<string, ChunkRule>();

  const add = (key: string, entry: any) => {
    const roleIds: string[] = Array.isArray(entry?.auth)
      ? entry.auth.filter((id: unknown): id is string => typeof id === "string" && !!id)
      : [];
    if (!key || roleIds.length === 0) return;
    const prev = rules.get(key);
    rules.set(key, {
      key,
      roleIds: [...new Set([...(prev?.roleIds ?? []), ...roleIds])],
      title: String(entry?.info?.title || prev?.title || key),
    });
  };

  const config = readJson(path.join(dataDir, "chunk-config.json"));
  if (config && typeof config === "object") {
    for (const [key, entry] of Object.entries(config)) add(key, entry);
  }

  const chunksDir = path.join(dataDir, "chunks");
  if (fs.existsSync(chunksDir)) {
    for (const file of fs.readdirSync(chunksDir)) {
      if (!file.endsWith(".json")) continue;
      const chunk = readJson(path.join(chunksDir, file));
      add(chunk?.id ?? file.replace(/\.json$/, ""), chunk);
    }
  }

  return rules;
}

function readJson(file: string): any {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/** An exit inside a gate would bounce a denied player straight back in. */
function warnAboutBadExits(gates: GateDef[]) {
  for (const gate of gates) {
    const trap = gates.find((other) => pointInGate(other, gate.exit));
    if (trap) {
      console.warn(
        `[Gates] Exit of "${gate.label}" (${gate.id}) is inside gate "${trap.label}" (${trap.id}). Move its exit offset outside.`,
      );
    }
  }
}

export class GateRegistry {
  private gates: GateDef[] = [];
  private chunkRules = new Map<string, ChunkRule>();
  private screenDefs = new Map<string, ScreenDef>();
  private watchers: fs.FSWatcher[] = [];
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();

  constructor(private readonly dataDir = getDataDir()) {
    this.reload();
  }

  all(): readonly GateDef[] {
    return this.gates;
  }

  /** The members-only rule for a chunk, or null when it's public. */
  chunkRule(key: string): ChunkRule | null {
    return this.chunkRules.get(key) ?? null;
  }

  allChunkRules(): ChunkRule[] {
    return [...this.chunkRules.values()];
  }

  screen(id: string): ScreenDef | null {
    return this.screenDefs.get(id) ?? null;
  }

  screens(): ScreenDef[] {
    return [...this.screenDefs.values()];
  }

  /** Replace the gate list (and optionally chunk rules and screens) directly. Used by tests. */
  set(gates: GateDef[], chunkRules?: Map<string, ChunkRule>, screens?: Map<string, ScreenDef>): void {
    this.gates = gates;
    if (chunkRules) this.chunkRules = chunkRules;
    if (screens) this.screenDefs = screens;
    this.listeners.forEach((fn) => fn());
  }

  reload(): void {
    this.set(loadGates(this.dataDir), loadChunkRules(this.dataDir), loadScreens(this.dataDir));
    console.log(
      `[Gates] ${this.gates.length} token gate(s), ${this.chunkRules.size} members-only chunk(s), ${this.screenDefs.size} video screen(s) loaded`,
    );
  }

  /** Called after every reload. Returns an unsubscribe function. */
  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Watch the scene files and reload (debounced) when they change. */
  watch(): void {
    if (this.watchers.length) return;

    const schedule = () => {
      if (this.reloadTimer) clearTimeout(this.reloadTimer);
      this.reloadTimer = setTimeout(() => this.reload(), 300);
    };

    for (const dir of [this.dataDir, path.join(this.dataDir, "chunks")]) {
      if (!fs.existsSync(dir)) continue;
      try {
        const watcher = fs.watch(dir, schedule);
        // An unhandled watcher error (e.g. the folder was deleted or renamed)
        // would crash the game server. Keep the gates we have and say so.
        watcher.on("error", (err) => {
          console.warn(`[Gates] Stopped watching ${dir}:`, err.message);
          watcher.close();
          this.watchers = this.watchers.filter((w) => w !== watcher);
        });
        this.watchers.push(watcher);
      } catch (err) {
        console.warn(`[Gates] Can't watch ${dir}:`, (err as Error).message);
      }
    }
  }

  close(): void {
    this.watchers.forEach((w) => w.close());
    this.watchers = [];
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
  }
}
