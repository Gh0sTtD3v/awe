import { readFile, copyFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname, basename, join } from "node:path";
import { readJsonFile, writeJsonFile, fileExists } from "../utils/file-io.js";
import { resolveProjectPath, getUploadedAssetsPath } from "../utils/paths.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

const SUPPORTED_EXTENSIONS = new Set([
  ".glb", ".gltf", ".png", ".jpg", ".jpeg", ".webp",
  ".mp3", ".wav", ".mp4", ".webm",
]);

const MIME_MAP: Record<string, string> = {
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

interface UploadedAsset {
  hash: string;
  url: string;
  name: string;
  mimeType: string;
  createdAt: number;
  [key: string]: unknown;
}

export async function uploadAsset(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const sourcePath = args.sourcePath as string;
  if (!sourcePath) return makeError("MISSING_PARAM", "sourcePath is required");

  const resolvedSource = resolveProjectPath(projectDir, sourcePath);
  if (!(await fileExists(resolvedSource))) {
    return makeError("FILE_NOT_FOUND", `Source file not found: ${sourcePath}`);
  }

  const ext = extname(resolvedSource).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return makeError("UNSUPPORTED_FORMAT", `Unsupported file type: ${ext}`, `Supported: ${[...SUPPORTED_EXTENSIONS].join(", ")}`);
  }

  const content = await readFile(resolvedSource);
  const hash = createHash("sha256").update(content).digest("hex");
  const mimeType = MIME_MAP[ext] ?? "application/octet-stream";
  const name = (args.name as string) ?? basename(resolvedSource);

  const assetsPath = getUploadedAssetsPath(projectDir);
  let assets: UploadedAsset[] = [];
  if (await fileExists(assetsPath)) {
    assets = await readJsonFile<UploadedAsset[]>(assetsPath);
  }

  const existing = assets.find((a) => a.hash === hash);
  if (existing) {
    return makeSuccess(existing);
  }

  const destFileName = `uploaded-assets-${hash.slice(0, 8)}${ext}`;
  const destDir = resolveProjectPath(projectDir, "public", "assets");
  await mkdir(destDir, { recursive: true });
  const destPath = join(destDir, destFileName);
  await copyFile(resolvedSource, destPath);

  const entry: UploadedAsset = {
    hash,
    url: `/assets/${destFileName}`,
    name,
    mimeType,
    createdAt: Date.now(),
  };

  assets.push(entry);
  await writeJsonFile(assetsPath, assets);

  return makeSuccess(entry);
}
