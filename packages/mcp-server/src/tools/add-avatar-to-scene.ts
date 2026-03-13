import { normalizeToArray } from "../utils/file-io.js";
import { getVrmsData } from "../utils/paths.js";
import { readScene, writeScene, generateId } from "../utils/scene.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse, XYZ, SceneComponent } from "../types.js";

export async function addAvatarToScene(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const avatarId = args.avatarId as string;
  if (!avatarId) return makeError("MISSING_PARAM", "avatarId is required");

  const raw = getVrmsData() as Record<string, Record<string, unknown>> | Array<Record<string, unknown>>;
  const avatars = normalizeToArray(raw);
  const avatar = avatars.find((a) => a.id === avatarId);
  if (!avatar) {
    return makeError("AVATAR_NOT_FOUND", `Avatar '${avatarId}' not found`);
  }

  const scene = await readScene(projectDir);
  const id = generateId();
  const position = (args.position as XYZ) ?? { x: 0, y: 0, z: 0 };
  const name = (args.name as string) ?? (avatar.name as string) ?? "Avatar";
  const animations = args.animations as string[] | undefined;

  const component: SceneComponent = {
    id,
    name,
    type: "avatar",
    position,
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    url: avatar.url as string,
    urlCompressed: avatar.urlCompressed as string | undefined,
    ...(animations ? { animations } : {}),
  };

  scene.components[id] = component;
  await writeScene(projectDir, scene);

  return makeSuccess(component);
}
