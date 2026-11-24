/**
 * `?plot=` deep links. The value is either a chunk key (`0_0_-1`) or a plot
 * slug set in the studio, looked up in the `plots-index.json` the studio
 * writes whenever a chunk config is saved.
 */

import { chunkKeyToCoords } from "@oncyberio/world-config";
import { loadPortals, type PortalEntry } from "@/lib/portals";

interface PlotIndexEntry {
  key: string;
  slug: string;
}

let _index: PlotIndexEntry[] | null = null;

async function loadPlotsIndex(): Promise<PlotIndexEntry[]> {
  if (_index) return _index;
  try {
    const res = await fetch("/data/plots-index.json");
    const data = res.ok ? await res.json() : [];
    _index = Array.isArray(data) ? data : [];
  } catch {
    _index = [];
  }
  return _index;
}

/** The raw `?plot=` value from the address bar, if any. */
export function readPlotParam(): string | null {
  try {
    return new URLSearchParams(window.location.search).get("plot")?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Resolve a `?plot=` value to a chunk key, or null if it matches nothing.
 * A plot slug wins; a portal slug is accepted too, as a link to that portal's plot.
 */
export async function resolvePlotKey(value: string): Promise<string | null> {
  if (chunkKeyToCoords(value)) return value;
  const slug = value.toLowerCase();
  const plot = (await loadPlotsIndex()).find((p) => p.slug.toLowerCase() === slug);
  if (plot) return plot.key;
  const portal = (await loadPortals()).find((p) => p.slug && p.slug.toLowerCase() === slug);
  return portal?.chunkKey ?? null;
}

/** A plot's entry point: the first portal inside it. */
export async function firstPortalIn(key: string): Promise<PortalEntry | null> {
  const portals = await loadPortals();
  return portals.find((p) => p.chunkKey === key) ?? null;
}

/**
 * Where the player starts: the first portal of the linked plot (`?plot=`),
 * otherwise the first portal of `defaultKey` (the Lobby).
 * Null only when that plot has no portal at all.
 */
export async function findSpawnEntry(defaultKey: string): Promise<PortalEntry | null> {
  const linked = readPlotParam();
  const linkedKey = linked ? await resolvePlotKey(linked) : null;
  if (linkedKey) {
    const entry = await firstPortalIn(linkedKey);
    if (entry) return entry;
  }
  return firstPortalIn(defaultKey);
}
