import { readScene, writeScene, generateId } from "../utils/scene.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse, XYZ, SceneComponent } from "../types.js";

export async function duplicateComponent(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const id = args.id as string;
  if (!id) return makeError("MISSING_PARAM", "id is required");

  const offset = (args.offset as XYZ) ?? { x: 2, y: 0, z: 0 };
  const newName = args.newName as string | undefined;

  const scene = await readScene(projectDir);
  const component = scene.components[id];
  if (!component) {
    return makeError("COMPONENT_NOT_FOUND", `Component with id '${id}' not found`);
  }

  const idMap = new Map<string, string>();
  const duplicated: SceneComponent[] = [];

  const rootId = generateId();
  idMap.set(id, rootId);

  const rootClone: SceneComponent = {
    ...structuredClone(component),
    id: rootId,
    name: newName ?? `${component.name} (copy)`,
    position: {
      x: (component.position?.x ?? 0) + offset.x,
      y: (component.position?.y ?? 0) + offset.y,
      z: (component.position?.z ?? 0) + offset.z,
    },
  };
  duplicated.push(rootClone);
  scene.components[rootId] = rootClone;

  const descendants = findAllDescendants(id, scene.components);
  for (const desc of descendants) {
    const newId = generateId();
    idMap.set(desc.id, newId);
    const clone: SceneComponent = {
      ...structuredClone(desc),
      id: newId,
      parentId: idMap.get(desc.parentId!) ?? desc.parentId,
    };
    duplicated.push(clone);
    scene.components[newId] = clone;
  }

  await writeScene(projectDir, scene);

  return makeSuccess(duplicated);
}

function findAllDescendants(parentId: string, components: Record<string, SceneComponent>): SceneComponent[] {
  const result: SceneComponent[] = [];
  const queue = [parentId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const comp of Object.values(components)) {
      if (comp.parentId === current && comp.id !== parentId) {
        result.push(comp);
        queue.push(comp.id);
      }
    }
  }
  return result;
}
