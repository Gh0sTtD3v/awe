import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { readJsonFile, fileExists } from "../utils/file-io.js";
import { resolveProjectPath } from "../utils/paths.js";
import { makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

export async function getProjectInfo(_args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const result: Record<string, unknown> = {};

  const metadataPath = resolveProjectPath(projectDir, "metadata.json");
  if (await fileExists(metadataPath)) {
    result.metadata = await readJsonFile(metadataPath);
  } else {
    result.metadata = null;
  }

  const pkgPath = resolveProjectPath(projectDir, "package.json");
  if (await fileExists(pkgPath)) {
    const pkg = await readJsonFile<Record<string, unknown>>(pkgPath);
    result.package = {
      name: pkg.name,
      version: pkg.version,
      dependencies: pkg.dependencies,
    };
  } else {
    result.package = null;
  }

  const srcDir = resolveProjectPath(projectDir, "src");
  if (await fileExists(srcDir)) {
    result.scripts = await listFilesRecursive(srcDir, [".ts", ".tsx"]);
  } else {
    result.scripts = null;
  }

  const dataDir = resolveProjectPath(projectDir, "public", "data");
  if (await fileExists(dataDir)) {
    result.dataFiles = await listFilesWithSize(dataDir);
  } else {
    result.dataFiles = null;
  }

  const assetsDir = resolveProjectPath(projectDir, "public", "assets");
  if (await fileExists(assetsDir)) {
    const assetFiles = await listFilesWithSize(assetsDir);
    const grouped: Record<string, typeof assetFiles> = {};
    for (const f of assetFiles) {
      const ext = extname(f.name).toLowerCase();
      const category = categorizeAsset(ext);
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(f);
    }
    result.assets = grouped;
  } else {
    result.assets = null;
  }

  const controlPresetsDir = resolveProjectPath(projectDir, "src", "lib", "control-presets");
  if (await fileExists(controlPresetsDir)) {
    const indexPath = join(controlPresetsDir, "index.ts");
    if (await fileExists(indexPath)) {
      const { readFile } = await import("node:fs/promises");
      const content = await readFile(indexPath, "utf-8");
      result.controlPreset = content;
    }
  } else {
    result.controlPreset = null;
  }

  return makeSuccess(result);
}

async function listFilesRecursive(dir: string, extensions: string[]): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listFilesRecursive(fullPath, extensions)));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(entry.name);
    }
  }
  return results;
}

async function listFilesWithSize(dir: string): Promise<Array<{ name: string; size: number }>> {
  const entries = await readdir(dir);
  const results: Array<{ name: string; size: number }> = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const s = await stat(fullPath);
    if (s.isFile()) {
      results.push({ name: entry, size: s.size });
    }
  }
  return results;
}

function categorizeAsset(ext: string): string {
  if ([".glb", ".gltf"].includes(ext)) return "models";
  if ([".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext)) return "images";
  if ([".mp3", ".wav", ".ogg"].includes(ext)) return "audio";
  if ([".mp4", ".webm"].includes(ext)) return "video";
  if ([".json"].includes(ext)) return "animations";
  return "other";
}
