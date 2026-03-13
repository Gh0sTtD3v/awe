import { readScene, writeScene, generateId } from "../utils/scene.js";
import { makeSuccess } from "../utils/errors.js";
import type { ToolResponse, SceneComponent } from "../types.js";

export async function setEnvironment(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const scene = await readScene(projectDir);
  const modified: SceneComponent[] = [];

  const bgConfig = args.background as Record<string, unknown> | undefined;
  if (bgConfig) {
    let bg = Object.values(scene.components).find((c) => c.type === "background");
    if (!bg) {
      const id = generateId();
      bg = { id, name: "Background", type: "background", position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
      scene.components[id] = bg;
    }
    bg.options = bgConfig;
    modified.push(bg);
  }

  const envmapConfig = args.envmap as Record<string, unknown> | undefined;
  if (envmapConfig) {
    let envmap = Object.values(scene.components).find((c) => c.type === "envmap");
    if (!envmap) {
      const id = generateId();
      envmap = { id, name: "Environment Map", type: "envmap", position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
      scene.components[id] = envmap;
    }
    envmap.options = envmapConfig;
    modified.push(envmap);
  }

  const postConfig = args.postprocessing as Record<string, unknown> | undefined;
  if (postConfig) {
    let postpro = Object.values(scene.components).find((c) => c.type === "postprocessing");
    if (!postpro) {
      const id = generateId();
      postpro = { id, name: "Post Processing", type: "postprocessing", position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
      scene.components[id] = postpro;
    }
    Object.assign(postpro, postConfig);
    modified.push(postpro);
  }

  await writeScene(projectDir, scene);

  return makeSuccess({ modified });
}
