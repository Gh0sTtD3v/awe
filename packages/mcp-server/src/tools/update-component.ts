import { readScene, writeScene, deepMerge } from "../utils/scene.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

export async function updateComponent(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const id = args.id as string;
  const updates = args.updates as Record<string, unknown>;
  if (!id) return makeError("MISSING_PARAM", "id is required");
  if (!updates) return makeError("MISSING_PARAM", "updates is required");

  if ("id" in updates) return makeError("IMMUTABLE_FIELD", "Cannot change component id");
  if ("type" in updates) return makeError("IMMUTABLE_FIELD", "Cannot change component type");

  const scene = await readScene(projectDir);
  const component = scene.components[id];
  if (!component) {
    return makeError("COMPONENT_NOT_FOUND", `Component with id '${id}' not found`);
  }

  scene.components[id] = deepMerge(component as unknown as Record<string, unknown>, updates) as typeof component;
  await writeScene(projectDir, scene);

  return makeSuccess(scene.components[id]);
}
