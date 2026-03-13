import { readJsonFile, fileExists, normalizeToArray } from "../utils/file-io.js";
import { getLibrary3DData, getVrmsData, getUploadedAssetsPath } from "../utils/paths.js";
import { makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

interface UnifiedResult {
  id: string;
  name: string;
  type: "model" | "avatar" | "upload";
  source: string;
  url?: string;
  thumbnail?: string;
}

export async function searchAssets(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const query = args.query as string;
  if (!query) return makeSuccess({ count: 0, results: [] });

  const types = (args.types as string[]) ?? ["model", "avatar", "upload"];
  const lower = query.toLowerCase();
  const results: UnifiedResult[] = [];

  if (types.includes("model")) {
    const models = getLibrary3DData() as Array<Record<string, unknown>>;
    for (const m of models) {
      const name = (m.name as string) ?? "";
      if (name.toLowerCase().includes(lower) || (m.source as Record<string, unknown>)?.name?.toString().toLowerCase().includes(lower)) {
        results.push({
          id: (m.id as string) ?? (m.hash as string) ?? "",
          name,
          type: "model",
          source: ((m.source as Record<string, unknown>)?.name as string) ?? "library3D",
          thumbnail: m.image as string,
        });
      }
    }
  }

  if (types.includes("avatar")) {
    const raw = getVrmsData() as Record<string, Record<string, unknown>> | Array<Record<string, unknown>>;
    const avatars = normalizeToArray(raw);
    for (const a of avatars) {
      const name = (a.name as string) ?? "";
      const desc = (a.description as string) ?? "";
      if (name.toLowerCase().includes(lower) || desc.toLowerCase().includes(lower)) {
        results.push({
          id: (a.id as string) ?? "",
          name,
          type: "avatar",
          source: "vrms",
          url: a.url as string,
          thumbnail: a.image as string,
        });
      }
    }
  }

  if (types.includes("upload")) {
    const uploadsPath = getUploadedAssetsPath(projectDir);
    if (await fileExists(uploadsPath)) {
      const uploads = await readJsonFile<Array<Record<string, unknown>>>(uploadsPath);
      for (const u of uploads) {
        const name = (u.name as string) ?? "";
        if (name.toLowerCase().includes(lower)) {
          results.push({
            id: (u.hash as string) ?? "",
            name,
            type: "upload",
            source: "uploaded",
            url: u.url as string,
          });
        }
      }
    }
  }

  results.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aExact = aName === lower;
    const bExact = bName === lower;
    if (aExact !== bExact) return aExact ? -1 : 1;
    const aStarts = aName.startsWith(lower);
    const bStarts = bName.startsWith(lower);
    if (aStarts !== bStarts) return aStarts ? -1 : 1;
    return 0;
  });

  return makeSuccess({ count: results.length, results });
}
