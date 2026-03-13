import { extname, basename } from "node:path";
import { OptimizeService } from "@oncyberio/asset-optimizer/dist/index.js";
import type { OOAsset } from "@oncyberio/asset-optimizer/dist/index.js";
import { fileExists } from "../utils/file-io.js";
import { resolveProjectPath } from "../utils/paths.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

const SUPPORTED_EXTENSIONS = new Set([".glb", ".gltf"]);

export async function optimizeModel(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const assetPath = args.assetPath as string;
  if (!assetPath) return makeError("MISSING_PARAM", "assetPath is required");

  const ext = extname(assetPath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return makeError("UNSUPPORTED_FORMAT", `Unsupported file type: ${ext}`, "Supported: .glb, .gltf");
  }

  const relativePath = assetPath.replace(/^\/+/, "");
  const resolvedPath = resolveProjectPath(projectDir, "public", relativePath);
  if (!(await fileExists(resolvedPath))) {
    return makeError("FILE_NOT_FOUND", `File not found: ${assetPath}`);
  }

  const publicDir = resolveProjectPath(projectDir, "public");

  const asset: OOAsset = {
    type: "model",
    url: assetPath,
    mime_type: ext === ".glb" ? "model/gltf-binary" : "model/gltf+json",
  };

  const compressionOptions = {
    useWeld: args.useWeld !== false,
    useDraco: args.useDraco !== false,
    useMeshOpt: args.useMeshOpt !== false,
  };

  try {
    const result = await OptimizeService.optimizeAsset(asset, compressionOptions, { publicDir });
    return makeSuccess(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeError("OPTIMIZE_FAILED", `Optimization failed: ${message}`);
  }
}
