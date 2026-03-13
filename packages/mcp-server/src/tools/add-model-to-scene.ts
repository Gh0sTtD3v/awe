import { getLibrary3DData } from "../utils/paths.js";
import { readScene, writeScene, generateId } from "../utils/scene.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse, XYZ, SceneComponent } from "../types.js";

export async function addModelToScene(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const modelId = args.modelId as string;
  if (!modelId) return makeError("MISSING_PARAM", "modelId is required");

  const models = getLibrary3DData() as Array<Record<string, unknown>>;
  const model = models.find((m) => m.id === modelId || m.hash === modelId);
  if (!model) {
    return makeError("MODEL_NOT_FOUND", `Model '${modelId}' not found in library`);
  }

  const scene = await readScene(projectDir);
  const parentId = args.parentId as string | undefined;
  if (parentId && !scene.components[parentId]) {
    return makeError("PARENT_NOT_FOUND", `Parent component '${parentId}' not found`);
  }

  const id = generateId();
  const position = (args.position as XYZ) ?? { x: 0, y: 0, z: 0 };
  const rotation = (args.rotation as XYZ) ?? { x: 0, y: 0, z: 0 };
  const scale = (args.scale as XYZ) ?? { x: 1, y: 1, z: 1 };
  const name = (args.name as string) ?? (model.name as string) ?? "Model";

  const component: SceneComponent = {
    id,
    name,
    type: "model",
    position,
    rotation,
    scale,
    url: model.url as string,
    hash: model.hash as string,
    optimized: model.optimized as Record<string, string> | undefined,
    ...(parentId ? { parentId } : {}),
  };

  scene.components[id] = component;
  await writeScene(projectDir, scene);

  return makeSuccess(component);
}
