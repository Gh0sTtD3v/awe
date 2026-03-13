import { resolve } from "node:path";
import library3dData from "../data/library-3d.json" with { type: "json" };
import vrmsData from "../data/vrms.json" with { type: "json" };

export function resolveProjectPath(projectDir: string, ...segments: string[]): string {
  const resolved = resolve(projectDir, ...segments);
  const normalizedProject = resolve(projectDir);
  if (!resolved.startsWith(normalizedProject)) {
    throw new Error(`Path traversal detected: ${segments.join("/")} escapes project directory`);
  }
  return resolved;
}

export function getScenePath(projectDir: string): string {
  return resolveProjectPath(projectDir, "public", "data", "static-scene.json");
}

export function getUploadedAssetsPath(projectDir: string): string {
  return resolveProjectPath(projectDir, "public", "data", "uploaded_assets.json");
}

export function getLibrary3DData(): unknown[] {
  return library3dData;
}

export function getVrmsData(): Record<string, unknown> | unknown[] {
  return vrmsData;
}
