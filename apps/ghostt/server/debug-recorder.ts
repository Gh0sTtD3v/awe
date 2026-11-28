import fs from "node:fs/promises";
import path from "node:path";
import { DEBUG_FRAME_INTERVAL_MS, DEBUG_FRAME_MAX_BYTES } from "../shared/messages";

/**
 * Stores webcam frames from testers with the Debug Recording permission
 * (who signed the recording agreement). Server-only data, next to
 * access.json and profiles: `.data/recordings/<YYYY-MM-DD>/<tester>/<time>.jpg`.
 * Override the folder with AWE_RECORDINGS_DIR.
 */

/** Accept a little early: client timers drift and tabs throttle. */
const MIN_GAP_MS = DEBUG_FRAME_INTERVAL_MS * 0.8;

function recordingsDir(): string {
  return path.resolve(process.env.AWE_RECORDINGS_DIR || path.join(process.cwd(), ".data", "recordings"));
}

/** A tester id that is safe as a folder name (DIDs contain colons). */
function folderName(subject: string): string {
  return subject.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "unknown";
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/** Colyseus hands binary payloads over as Buffer / Uint8Array. */
export function asBytes(payload: unknown): Uint8Array | null {
  if (payload instanceof Uint8Array) return payload;
  if (payload instanceof ArrayBuffer) return new Uint8Array(payload);
  return null;
}

export class DebugRecorder {
  private lastAt = new Map<string, number>();

  /**
   * Save one frame for `subject` (the tester's account id). Returns false if
   * it was rejected (too soon, too big, not a JPEG).
   */
  async save(sessionId: string, subject: string, bytes: Uint8Array): Promise<boolean> {
    const now = Date.now();
    if (now - (this.lastAt.get(sessionId) ?? 0) < MIN_GAP_MS) return false;
    if (bytes.length > DEBUG_FRAME_MAX_BYTES || !isJpeg(bytes)) return false;
    this.lastAt.set(sessionId, now);

    const stamp = new Date(now).toISOString(); // 2026-11-28T18:30:00.000Z
    const dir = path.join(recordingsDir(), stamp.slice(0, 10), folderName(subject));
    const file = path.join(dir, `${stamp.slice(11, 23).replace(/[:.]/g, "-")}.jpg`);
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(file, bytes);
      return true;
    } catch (error) {
      console.error("[DebugRecorder] could not save frame", error);
      return false;
    }
  }

  forget(sessionId: string): void {
    this.lastAt.delete(sessionId);
  }
}
