import { readScene, writeScene } from "../utils/scene.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

export async function deleteComponent(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const id = args.id as string;
  if (!id) return makeError("MISSING_PARAM", "id is required");

  const recursive = args.recursive !== false;

  const scene = await readScene(projectDir);
  const component = scene.components[id];
  if (!component) {
    return makeError("COMPONENT_NOT_FOUND", `Component with id '${id}' not found`);
  }

  const warnings: string[] = [];
  if (component.type === "spawn") {
    const spawnCount = Object.values(scene.components).filter((c) => c.type === "spawn").length;
    if (spawnCount <= 1) {
      warnings.push("Deleting the only spawn point in the scene");
    }
  }

  const deletedIds: string[] = [id];

  if (recursive) {
    const descendants = findDescendants(id, scene.components);
    deletedIds.push(...descendants);
  } else {
    const children = Object.values(scene.components).filter((c) => c.parentId === id);
    for (const child of children) {
      scene.components[child.id] = {
        ...child,
        parentId: component.parentId,
      };
      if (!component.parentId) {
        delete scene.components[child.id].parentId;
      }
    }
  }

  for (const did of deletedIds) {
    delete scene.components[did];
  }

  await writeScene(projectDir, scene);

  return makeSuccess({
    deletedIds,
    ...(warnings.length > 0 ? { warnings } : {}),
  });
}

function findDescendants(parentId: string, components: Record<string, { id: string; parentId?: string }>): string[] {
  const result: string[] = [];
  const queue = [parentId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const comp of Object.values(components)) {
      if (comp.parentId === current && comp.id !== parentId) {
        result.push(comp.id);
        queue.push(comp.id);
      }
    }
  }
  return result;
}
