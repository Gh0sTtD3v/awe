import { readScene, writeScene, generateId } from "../utils/scene.js";
import { makeSuccess } from "../utils/errors.js";
import type { ToolResponse, SceneComponent } from "../types.js";

const PRESETS: Record<string, { ambient: Record<string, unknown>; directional: Record<string, unknown>; fog?: Record<string, unknown> }> = {
  day: {
    ambient: { color: "#ffffff", intensity: 0.6 },
    directional: { color: "#fff5e0", intensity: 1.0, position: { x: 5, y: 10, z: 5 } },
  },
  night: {
    ambient: { color: "#1a1a40", intensity: 0.2 },
    directional: { color: "#4444aa", intensity: 0.3, position: { x: -3, y: 8, z: -3 } },
    fog: { enabled: true, color: "#1a1a40", near: 10, far: 100 },
  },
  sunset: {
    ambient: { color: "#ff8844", intensity: 0.4 },
    directional: { color: "#ff6622", intensity: 0.8, position: { x: 10, y: 3, z: 0 } },
  },
  studio: {
    ambient: { color: "#ffffff", intensity: 0.5 },
    directional: { color: "#ffffff", intensity: 0.8, position: { x: 5, y: 8, z: 5 } },
  },
};

export async function setLighting(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const preset = args.preset as string | undefined;
  const scene = await readScene(projectDir);
  const modified: SceneComponent[] = [];

  let ambientConfig = args.ambient as Record<string, unknown> | undefined;
  let directionalConfig = args.directional as Record<string, unknown> | undefined;
  let fogConfig = args.fog as Record<string, unknown> | undefined;

  if (preset && preset !== "custom" && PRESETS[preset]) {
    const p = PRESETS[preset];
    ambientConfig = ambientConfig ?? p.ambient;
    directionalConfig = directionalConfig ?? p.directional;
    fogConfig = fogConfig ?? p.fog;
  }

  if (ambientConfig || directionalConfig) {
    let light = Object.values(scene.components).find((c) => c.type === "light");
    if (!light) {
      const id = generateId();
      light = { id, name: "Light", type: "light", position: { x: 0, y: 10, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
      scene.components[id] = light;
    }
    if (ambientConfig) light.ambient = ambientConfig;
    if (directionalConfig) {
      light.directional = directionalConfig;
      if ((directionalConfig as Record<string, unknown>).position) {
        light.position = (directionalConfig as Record<string, unknown>).position as typeof light.position;
      }
    }
    modified.push(light);
  }

  if (fogConfig) {
    let fog = Object.values(scene.components).find((c) => c.type === "fog");
    if (!fog) {
      const id = generateId();
      fog = { id, name: "Fog", type: "fog", position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
      scene.components[id] = fog;
    }
    Object.assign(fog, fogConfig);
    modified.push(fog);
  }

  await writeScene(projectDir, scene);

  return makeSuccess({ modified });
}
