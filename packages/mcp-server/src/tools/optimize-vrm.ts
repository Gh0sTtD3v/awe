import { readFile } from "node:fs/promises";
import { extname, basename } from "node:path";
import { OptimizeService } from "@oncyberio/asset-optimizer/dist/index.js";
import { fileExists } from "../utils/file-io.js";
import { resolveProjectPath } from "../utils/paths.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

const SUPPORTED_EXTENSIONS = new Set([".vrm", ".glb"]);

export async function optimizeVrm(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const assetPath = args.assetPath as string;
  if (!assetPath) return makeError("MISSING_PARAM", "assetPath is required");

  const ext = extname(assetPath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return makeError("UNSUPPORTED_FORMAT", `Unsupported file type: ${ext}`, "Supported: .vrm, .glb");
  }

  const relativePath = assetPath.replace(/^\/+/, "");
  const resolvedPath = resolveProjectPath(projectDir, "public", relativePath);
  if (!(await fileExists(resolvedPath))) {
    return makeError("FILE_NOT_FOUND", `File not found: ${assetPath}`);
  }

  const publicDir = resolveProjectPath(projectDir, "public");
  const filename = basename(assetPath);

  try {
    const buffer = await readFile(resolvedPath);
    const url = await OptimizeService.optimizeVRM(buffer, filename, publicDir);
    return makeSuccess({ optimizedUrl: url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeError("OPTIMIZE_FAILED", `VRM optimization failed: ${message}`);
  }
}
