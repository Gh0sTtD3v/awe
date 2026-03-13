import { normalizeToArray } from "../utils/file-io.js";
import { getVrmsData } from "../utils/paths.js";
import { readScene, writeScene, generateId } from "../utils/scene.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse, XYZ } from "../types.js";

export async function setSpawn(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const position = args.position as XYZ;
  if (!position) return makeError("MISSING_PARAM", "position is required");

  const rotation = (args.rotation as XYZ) ?? { x: 0, y: 0, z: 0 };
  const avatarId = args.avatarId as string | undefined;

  if (avatarId) {
    const avatars = normalizeToArray(getVrmsData()) as Array<Record<string, unknown>>;
    const avatar = avatars.find((a) => a.id === avatarId);
    if (!avatar) {
      return makeError("AVATAR_NOT_FOUND", `Avatar '${avatarId}' not found in vrms.json`);
    }
  }

  const scene = await readScene(projectDir);

  let spawn = Object.values(scene.components).find((c) => c.type === "spawn");
  if (spawn) {
    spawn.position = position;
    spawn.rotation = rotation;
    if (avatarId) {
      spawn.avatarId = avatarId;
    }
  } else {
    const id = generateId();
    spawn = {
      id,
      name: "Spawn Point",
      type: "spawn",
      position,
      rotation,
      scale: { x: 1, y: 1, z: 1 },
      ...(avatarId ? { avatarId } : {}),
    };
    scene.components[id] = spawn;
  }

  await writeScene(projectDir, scene);

  return makeSuccess(spawn);
}
