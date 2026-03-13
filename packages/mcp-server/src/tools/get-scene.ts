import { readScene } from "../utils/scene.js";
import { getScenePath } from "../utils/paths.js";
import { fileExists } from "../utils/file-io.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse, SceneComponent } from "../types.js";

export async function getScene(_args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const scenePath = getScenePath(projectDir);
  if (!(await fileExists(scenePath))) {
    return makeError("SCENE_NOT_FOUND", "static-scene.json not found", "Create a scene file at public/data/static-scene.json");
  }

  const scene = await readScene(projectDir);
  const components = scene.components;

  const typeCounts: Record<string, number> = {};
  for (const comp of Object.values(components)) {
    typeCounts[comp.type] = (typeCounts[comp.type] || 0) + 1;
  }

  const hierarchy = buildHierarchy(components);

  return makeSuccess({
    metadata: {
      id: scene.id,
      creatorId: scene.creatorId,
      editors: scene.editors,
      createdAt: scene.createdAt,
      updatedAt: scene.updatedAt,
    },
    summary: {
      totalComponents: Object.keys(components).length,
      byType: typeCounts,
    },
    hierarchy,
    scene,
  });
}

interface HierarchyNode {
  id: string;
  name: string;
  type: string;
  children: HierarchyNode[];
}

function buildHierarchy(components: Record<string, SceneComponent>): HierarchyNode[] {
  const roots: HierarchyNode[] = [];
  const nodeMap = new Map<string, HierarchyNode>();

  for (const comp of Object.values(components)) {
    nodeMap.set(comp.id, { id: comp.id, name: comp.name, type: comp.type, children: [] });
  }

  for (const comp of Object.values(components)) {
    const node = nodeMap.get(comp.id)!;
    if (comp.parentId && nodeMap.has(comp.parentId)) {
      nodeMap.get(comp.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
