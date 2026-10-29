import fs from "node:fs";
import path from "node:path";
import { normalizeProfileData, type ProfileData } from "./types";

/** Where profiles live. JSON for now; a database implements the same interface later. */
export interface ProfileStore {
  read(): Promise<ProfileData>;
  /** Read-modify-write. Updates from this process never interleave. */
  update(fn: (data: ProfileData) => ProfileData | Promise<ProfileData>): Promise<ProfileData>;
  /** Called (debounced) when the data changes, from this or another process. */
  watch(fn: () => void): () => void;
}

/**
 * One JSON file outside `public/`, like the access store: mtime-cached reads
 * (so the game server sees edits made through the web app) and atomic writes.
 */
export class JsonProfileStore implements ProfileStore {
  private cache: { mtimeMs: number; size: number; data: ProfileData } | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(readonly file: string) {}

  async read(): Promise<ProfileData> {
    return this.readSync();
  }

  private readSync(): ProfileData {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(this.file);
    } catch {
      return { version: 1, profiles: {} };
    }
    if (this.cache && this.cache.mtimeMs === stat.mtimeMs && this.cache.size === stat.size) {
      return this.cache.data;
    }

    try {
      const data = normalizeProfileData(JSON.parse(fs.readFileSync(this.file, "utf8")));
      this.cache = { mtimeMs: stat.mtimeMs, size: stat.size, data };
      return data;
    } catch (err) {
      // Never overwrite a file we couldn't read: that would wipe every profile.
      throw new Error(`[Profiles] Can't read ${this.file}: ${(err as Error).message}`);
    }
  }

  update(fn: (data: ProfileData) => ProfileData | Promise<ProfileData>): Promise<ProfileData> {
    const run = async () => {
      const next = normalizeProfileData(await fn(this.readSync()));
      await this.write(next);
      return next;
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => {});
    return result;
  }

  private async write(data: ProfileData): Promise<void> {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");

    // Windows can briefly refuse the rename while another process reads the file.
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
        console.warn(`[Profiles] Stopped watching ${dir}:`, err.message);
        watcher?.close();
      });
    } catch (err) {
      console.warn(`[Profiles] Can't watch ${dir}:`, (err as Error).message);
    }

    return () => {
      if (timer) clearTimeout(timer);
      watcher?.close();
    };
  }
}
