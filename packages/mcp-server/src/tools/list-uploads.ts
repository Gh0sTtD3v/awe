import { readJsonFile, fileExists } from "../utils/file-io.js";
import { getUploadedAssetsPath } from "../utils/paths.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

interface UploadedAsset {
  hash?: string;
  url?: string;
  name?: string;
  mimeType?: string;
  createdAt?: number;
  d_optimized_files?: Record<string, string>;
  [key: string]: unknown;
}

export async function listUploads(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const assetsPath = getUploadedAssetsPath(projectDir);
  if (!(await fileExists(assetsPath))) {
    return makeError("FILE_NOT_FOUND", "uploaded_assets.json not found");
  }

  const assets = await readJsonFile<UploadedAsset[]>(assetsPath);
  let filtered = assets;

  const mimeType = args.mimeType as string | undefined;
  if (mimeType) {
    filtered = filtered.filter((a) => a.mimeType?.startsWith(mimeType));
  }

  const search = args.search as string | undefined;
  if (search) {
    const lower = search.toLowerCase();
    filtered = filtered.filter((a) => a.name?.toLowerCase().includes(lower));
  }

  const results = filtered.map((a) => ({
    hash: a.hash,
    url: a.url,
    name: a.name,
    mimeType: a.mimeType,
    createdAt: a.createdAt,
    optimized: a.d_optimized_files ? Object.keys(a.d_optimized_files) : [],
  }));

  return makeSuccess({ count: results.length, results });
}
