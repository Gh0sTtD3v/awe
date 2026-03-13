import { readScene, writeScene, generateId } from "../utils/scene.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse, SceneComponent } from "../types.js";

export async function groupComponents(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const componentIds = args.componentIds as string[];
  const groupName = args.groupName as string;
  if (!componentIds?.length) return makeError("MISSING_PARAM", "componentIds is required");
  if (!groupName) return makeError("MISSING_PARAM", "groupName is required");

  const scene = await readScene(projectDir);

  const invalidIds = componentIds.filter((id) => !scene.components[id]);
  if (invalidIds.length > 0) {
    return makeError("COMPONENT_NOT_FOUND", `Components not found: ${invalidIds.join(", ")}`);
  }

  const components = componentIds.map((id) => scene.components[id]);
  const centroid = {
    x: components.reduce((sum, c) => sum + (c.position?.x ?? 0), 0) / components.length,
    y: components.reduce((sum, c) => sum + (c.position?.y ?? 0), 0) / components.length,
    z: components.reduce((sum, c) => sum + (c.position?.z ?? 0), 0) / components.length,
  };

  const groupId = generateId();
  const group: SceneComponent = {
    id: groupId,
    name: groupName,
    type: "group",
    position: centroid,
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };

  scene.components[groupId] = group;

  for (const id of componentIds) {
    scene.components[id].parentId = groupId;
  }

  await writeScene(projectDir, scene);

  return makeSuccess({
    group,
    children: componentIds.map((id) => ({ id, name: scene.components[id].name })),
  });
}
