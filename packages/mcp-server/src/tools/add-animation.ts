import { readScene, writeScene, generateId } from "../utils/scene.js";
import { resolveProjectPath } from "../utils/paths.js";
import { fileExists } from "../utils/file-io.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

export async function addAnimation(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const fileName = args.fileName as string;
  const name = args.name as string;
  if (!fileName) return makeError("MISSING_PARAM", "fileName is required");
  if (!name) return makeError("MISSING_PARAM", "name is required");

  const jsonFileName = fileName.endsWith(".json") ? fileName : fileName.replace(/\.\w+$/, ".json");
  const animFilePath = resolveProjectPath(projectDir, "public", "assets", "anims", jsonFileName);
  if (!(await fileExists(animFilePath))) {
    return makeError("ANIMATION_FILE_NOT_FOUND", `Animation file '${jsonFileName}' not found in public/assets/anims/`);
  }

  const loop = (args.loop as boolean) ?? true;
  const sync = (args.sync as boolean) ?? false;
  const timeScale = (args.timeScale as number) ?? 1;

  const scene = await readScene(projectDir);

  let vrmAnims = Object.values(scene.components).find((c) => c.type === "vrm-anims");
  if (!vrmAnims) {
    const id = generateId();
    vrmAnims = {
      id,
      name: "VRM Animations",
      type: "vrm-anims",
      anims: {},
    };
    scene.components[id] = vrmAnims;
  }

  const anims = (vrmAnims.anims ?? vrmAnims.data?.anims ?? {}) as Record<string, Record<string, unknown>>;
  anims[name] = {
    fileName,
    name,
    loop,
    sync,
    timeScale,
    url: `/assets/anims/${jsonFileName}`,
  };

  if (vrmAnims.anims) {
    (vrmAnims as Record<string, unknown>).anims = anims;
  } else {
    if (!vrmAnims.data) vrmAnims.data = {};
    (vrmAnims.data as Record<string, unknown>).anims = anims;
  }

  await writeScene(projectDir, scene);

  return makeSuccess({
    clips: Object.values(anims),
  });
}
