import { readScene, writeScene, generateId } from "../utils/scene.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import { VALID_COMPONENT_TYPES } from "../types.js";
import type { ToolResponse, XYZ, SceneComponent } from "../types.js";

/** Common keys that are NOT type-specific component properties */
const COMMON_KEYS = new Set(["type", "name", "position", "rotation", "scale", "parentId", "data"]);

export async function addComponent(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const type = args.type as string;
  const name = args.name as string;
  if (!type) return makeError("MISSING_PARAM", "type is required");
  if (!name) return makeError("MISSING_PARAM", "name is required");

  if (!(VALID_COMPONENT_TYPES as readonly string[]).includes(type)) {
    return makeError("INVALID_TYPE", `Invalid component type '${type}'`, `Valid types: ${VALID_COMPONENT_TYPES.join(", ")}`);
  }

  const scene = await readScene(projectDir);

  const parentId = args.parentId as string | undefined;
  if (parentId && !scene.components[parentId]) {
    return makeError("PARENT_NOT_FOUND", `Parent component '${parentId}' not found`);
  }

  const position = (args.position as XYZ) ?? { x: 0, y: 0, z: 0 };
  const rotation = (args.rotation as XYZ) ?? { x: 0, y: 0, z: 0 };
  const scale = (args.scale as XYZ) ?? { x: 1, y: 1, z: 1 };

  // Collect type-specific properties from root level args
  const typeSpecificProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (!COMMON_KEYS.has(key)) {
      typeSpecificProps[key] = value;
    }
  }

  // Backward compat: if caller passed a `data` bag, spread it at the root level
  const dataBag = args.data as Record<string, unknown> | undefined;
  if (dataBag && typeof dataBag === "object") {
    Object.assign(typeSpecificProps, dataBag);
  }

  const id = generateId();
  const component: SceneComponent = {
    id,
    name,
    type,
    position,
    rotation,
    scale,
    ...typeSpecificProps,
    ...(parentId ? { parentId } : {}),
  };

  scene.components[id] = component;
  await writeScene(projectDir, scene);

  return makeSuccess(component);
}
