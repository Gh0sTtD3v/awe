import fs from "fs";
import path from "path";
import { toBaseUnits, type HoldingsProvider, type Requirement } from "./types";

/**
 * Holdings from a local JSON file, for building and testing gates before a
 * real indexer is available:
 *
 * ```json
 * {
 *   "cosmos1…": {
 *     "cft20": { "ROIDS": "1000" },
 *     "inscriptions": ["my-collection"]
 *   }
 * }
 * ```
 *
 * Kept out of `public/` on purpose — Next serves that folder to anyone.
 * Re-read when the file changes, so edits apply without a restart.
 */

interface HoldingsFile {
  [address: string]: {
    cft20?: Record<string, string | number>;
    inscriptions?: string[];
  };
}

/** Display-unit precision used to compare stub balances. */
const STUB_DECIMALS = 18;

export function getHoldingsFilePath(): string {
  return process.env.AWE_HOLDINGS_FILE || path.join(process.cwd(), ".data", "holdings.json");
}

export class StubHoldingsProvider implements HoldingsProvider {
  readonly name = "stub";

  private cache: { mtimeMs: number; data: HoldingsFile } | null = null;

  constructor(private readonly filePath = getHoldingsFilePath()) {}

  private read(): HoldingsFile {
    let mtimeMs: number;
    try {
      mtimeMs = fs.statSync(this.filePath).mtimeMs;
    } catch {
      return {}; // No file: nobody holds anything.
    }

    if (this.cache?.mtimeMs !== mtimeMs) {
      this.cache = { mtimeMs, data: JSON.parse(fs.readFileSync(this.filePath, "utf8")) };
    }
    return this.cache.data;
  }

  async meets(address: string, requirement: Requirement): Promise<boolean> {
    const holder = this.read()[address];
    if (!holder) return false;

    if (requirement.type === "inscription") {
      return (
        !!requirement.collection &&
        (holder.inscriptions ?? []).includes(requirement.collection)
      );
    }

    const ticker = requirement.ticker?.toUpperCase();
    const entry = Object.entries(holder.cft20 ?? {}).find(
      ([t]) => t.toUpperCase() === ticker,
    );
    if (!entry) return false;

    return (
      toBaseUnits(String(entry[1]), STUB_DECIMALS) >=
      toBaseUnits(requirement.minAmount, STUB_DECIMALS)
    );
  }
}
