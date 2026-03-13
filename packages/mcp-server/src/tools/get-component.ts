import { readScene } from "../utils/scene.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

export async function getComponent(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const id = args.id as string;
  if (!id) return makeError("MISSING_PARAM", "id is required");

  const scene = await readScene(projectDir);
  const component = scene.components[id];
  if (!component) {
    return makeError("COMPONENT_NOT_FOUND", `Component with id '${id}' not found`);
  }

  const children = Object.values(scene.components)
    .filter((c) => c.parentId === id)
    .map((c) => ({ id: c.id, name: c.name }));

  return makeSuccess({
    ...component,
    children,
  });
}
