import fs from "node:fs";
import path from "node:path";

/**
 * Load `.env` then `.env.local` into `process.env`, the way Next does for the
 * web app. The game server runs under tsx, which loads neither, and needs the
 * same Privy / holdings settings. Variables already set in the environment win.
 *
 * Supports `KEY=value`, `KEY="value"` (with `\n` escapes) and `KEY='value'`.
 */
export function loadEnv(dir = process.cwd()): void {
  const fromFiles: Record<string, string> = {};

  for (const name of [".env", ".env.local"]) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) continue;
    Object.assign(fromFiles, parseEnv(fs.readFileSync(file, "utf8")));
  }

  for (const [key, value] of Object.entries(fromFiles)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim().replace(/^export\s+/, "");
    let value = line.slice(eq + 1).trim();

    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"');
    } else if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "");
    }

    out[key] = value;
  }

  return out;
}
