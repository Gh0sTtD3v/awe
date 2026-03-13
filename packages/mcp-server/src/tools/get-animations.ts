import { readdir } from "node:fs/promises";
import { readScene } from "../utils/scene.js";
import { resolveProjectPath } from "../utils/paths.js";
import { fileExists } from "../utils/file-io.js";
import { makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

export async function getAnimations(_args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const scene = await readScene(projectDir);

  const vrmAnims = Object.values(scene.components).find((c) => c.type === "vrm-anims");
  const anims = (vrmAnims?.anims ?? vrmAnims?.data?.anims ?? {}) as Record<string, Record<string, unknown>>;

  const clips = Object.values(anims).map((a) => ({
    name: a.name,
    fileName: a.fileName,
    loop: a.loop,
    sync: a.sync,
    timeScale: a.timeScale,
    url: a.url,
  }));

  const registeredFiles = new Set(Object.values(anims).map((a) => a.fileName as string).filter(Boolean));

  let availableFiles: string[] = [];
  const animsDir = resolveProjectPath(projectDir, "public", "assets", "anims");
  if (await fileExists(animsDir)) {
    const entries = await readdir(animsDir);
    availableFiles = entries.filter((f) => f.endsWith(".json"));
  }

  const unregistered = availableFiles.filter((f) => {
    const fbxName = f.replace(".json", ".fbx");
    return !registeredFiles.has(f) && !registeredFiles.has(fbxName);
  });

  return makeSuccess({
    clips,
    availableFiles,
    unregisteredFiles: unregistered,
  });
}
