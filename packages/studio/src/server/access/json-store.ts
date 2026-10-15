import fs from "node:fs";
import path from "node:path";
import { defaultAccessData, normalizeAccessData } from "./resolve";
import type { AccessData } from "./types";

/**
 * Where roles and members live. JSON for now; a database implements the same
 * interface later without callers noticing.
 */
export interface AccessStore {
  read(): Promise<AccessData>;
  /** Read-modify-write. Updates from this process never interleave. */
  update(fn: (data: AccessData) => AccessData | Promise<AccessData>): Promise<AccessData>;
  /** Called (debounced) when the data changes, from this or another process. */
  watch(fn: () => void): () => void;
}

export interface JsonAccessStoreOptions {
  file: string;
  /**
   * Roles saved by the first studio UI, under `public/data/roles.json`. Imported
   * once when no access file exists yet; never written again.
   */
  legacyRolesFile?: string;
}

/**
 * One JSON file, outside `public/` — it holds member ids and wallet addresses.
 *
 * - Reads are cached by mtime, so the game server sees edits the studio makes.
 * - Writes go to a temp file and are renamed into place, so a reader never
 *   sees half a file.
 *
 * Known limit: two processes updating at the same instant can lose one
 * update (last rename wins). Fine for studio edits and occasional bans; a real
 * database fixes it.
 */
export class JsonAccessStore implements AccessStore {
  private cache: { mtimeMs: number; size: number; data: AccessData } | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly options: JsonAccessStoreOptions) {}

  get file(): string {
    return this.options.file;
  }

  async read(): Promise<AccessData> {
    return this.readSync();
  }

  private readSync(): AccessData {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(this.file);
    } catch {
      this.cache = null;
      return this.seed();
    }

    if (this.cache && this.cache.mtimeMs === stat.mtimeMs && this.cache.size === stat.size) {
      return this.cache.data;
    }

    try {
      const data = normalizeAccessData(JSON.parse(fs.readFileSync(this.file, "utf8")));
      this.cache = { mtimeMs: stat.mtimeMs, size: stat.size, data };
      return data;
    } catch (err) {
      // A corrupt file must not silently become "no members, default roles":
      // that could unban people. Refuse until someone fixes it.
      throw new Error(`[Access] Can't read ${this.file}: ${(err as Error).message}`);
    }
  }

  /** What a world starts with: imported legacy roles, or the defaults. */
  private seed(): AccessData {
    const legacy = this.options.legacyRolesFile;
    if (legacy && fs.existsSync(legacy)) {
      try {
        const roles = JSON.parse(fs.readFileSync(legacy, "utf8"));
        if (Array.isArray(roles)) return normalizeAccessData({ version: 1, roles, members: [] });
      } catch {
        // Fall through to the defaults.
      }
    }
    return defaultAccessData();
  }

  update(fn: (data: AccessData) => AccessData | Promise<AccessData>): Promise<AccessData> {
    const run = async () => {
      const next = normalizeAccessData(await fn(this.readSync()));
      await this.write(next);
      return next;
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => {});
    return result;
  }

  private async write(data: AccessData): Promise<void> {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");

    // Windows can briefly refuse the rename while another process has the
    // file open for reading.
    for (let attempt = 0; ; attempt++) {
      try {
        fs.renameSync(tmp, this.file);
        break;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (attempt >= 5 || (code !== "EPERM" && code !== "EBUSY" && code !== "EACCES")) {
          fs.rmSync(tmp, { force: true });
          throw err;
        }
        await new Promise((r) => setTimeout(r, 20 * (attempt + 1)));
      }
    }

    const stat = fs.statSync(this.file);
    this.cache = { mtimeMs: stat.mtimeMs, size: stat.size, data };
  }

  watch(fn: () => void): () => void {
    const dir = path.dirname(this.file);
    const name = path.basename(this.file);
    fs.mkdirSync(dir, { recursive: true });

    let timer: ReturnType<typeof setTimeout> | null = null;
    let watcher: fs.FSWatcher | null = null;
    try {
      watcher = fs.watch(dir, (_event, changed) => {
        if (changed && changed.toString() !== name) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(fn, 200);
      });
      watcher.on("error", (err) => {
        console.warn(`[Access] Stopped watching ${dir}:`, err.message);
        watcher?.close();
      });
    } catch (err) {
      console.warn(`[Access] Can't watch ${dir}:`, (err as Error).message);
    }

    return () => {
      if (timer) clearTimeout(timer);
      watcher?.close();
    };
  }
}
