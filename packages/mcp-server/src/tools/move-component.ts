import { readScene, writeScene } from "../utils/scene.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

export async function moveComponent(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const id = args.id as string;
  if (!id) return makeError("MISSING_PARAM", "id is required");
  if (!("newParentId" in args)) return makeError("MISSING_PARAM", "newParentId is required");

  const newParentId = args.newParentId as string | null;

  const scene = await readScene(projectDir);
  const component = scene.components[id];
  if (!component) {
    return makeError("COMPONENT_NOT_FOUND", `Component with id '${id}' not found`);
  }

  if (newParentId !== null) {
    if (!scene.components[newParentId]) {
      return makeError("COMPONENT_NOT_FOUND", `New parent '${newParentId}' not found`);
    }

    let current: string | undefined = newParentId;
    while (current) {
      if (current === id) {
        return makeError("CIRCULAR_REFERENCE", "Cannot parent a component to its own descendant");
      }
      current = scene.components[current]?.parentId;
    }
  }

  if (newParentId === null) {
    delete scene.components[id].parentId;
  } else {
    scene.components[id].parentId = newParentId;
  }

  await writeScene(projectDir, scene);

  return makeSuccess(scene.components[id]);
}
