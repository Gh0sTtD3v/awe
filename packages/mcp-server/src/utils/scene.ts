import { v4 as uuidv4 } from "uuid";
import { readJsonFile, writeJsonFile } from "./file-io.js";
import { getScenePath } from "./paths.js";
import type { SceneData, SceneComponent } from "../types.js";

export function generateId(): string {
  return uuidv4();
}

interface RawScene {
  id?: string;
  creatorId?: string;
  editors?: string[];
  components?: Record<string, SceneComponent>;
  items?: SceneComponent[];
  params?: Record<string, unknown>;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: unknown;
}

export async function readScene(projectDir: string): Promise<SceneData> {
  const scenePath = getScenePath(projectDir);
  const raw = await readJsonFile<RawScene>(scenePath);

  let components: Record<string, SceneComponent>;

  if (raw.components && typeof raw.components === "object" && !Array.isArray(raw.components)) {
    components = raw.components;
  } else if (Array.isArray(raw.items)) {
    components = {};
    for (const item of raw.items) {
      if (item.id) {
        components[item.id] = item;
      }
    }
  } else {
    components = {};
  }

  return {
    id: raw.id,
    creatorId: raw.creatorId,
    editors: raw.editors,
    components,
    params: raw.params,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export async function writeScene(projectDir: string, sceneData: SceneData): Promise<void> {
  const scenePath = getScenePath(projectDir);
  const output = {
    ...sceneData,
    updatedAt: Date.now(),
  };
  await writeJsonFile(scenePath, output);
}

export function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    if (sourceVal === null) {
      delete result[key];
    } else if (
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      sourceVal !== null &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key]) &&
      result[key] !== null
    ) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, sourceVal as Record<string, unknown>);
    } else {
      result[key] = sourceVal;
    }
  }
  return result;
}
