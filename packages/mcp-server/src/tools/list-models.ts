import { getLibrary3DData } from "../utils/paths.js";
import { makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

interface LibraryModel {
  id?: string;
  hash?: string;
  name?: string;
  image?: string;
  source?: { name?: string; slug?: string };
  optimized?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function listModels(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const models = getLibrary3DData() as LibraryModel[];
  let filtered = models;

  const search = args.search as string | undefined;
  const source = args.source as string | undefined;

  if (search) {
    const lower = search.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.name?.toLowerCase().includes(lower) ||
        m.source?.name?.toLowerCase().includes(lower)
    );
  }

  if (source) {
    filtered = filtered.filter((m) => m.source?.slug === source);
  }

  const limit = Math.min((args.limit as number) ?? 20, 100);
  const offset = (args.offset as number) ?? 0;
  const paginated = filtered.slice(offset, offset + limit);

  const results = paginated.map((m) => ({
    id: m.id ?? m.hash,
    name: m.name,
    hash: m.hash,
    image: m.image,
    source: m.source?.name,
    optimized: m.optimized ? Object.keys(m.optimized) : [],
  }));

  return makeSuccess({ totalCount: filtered.length, results });
}
