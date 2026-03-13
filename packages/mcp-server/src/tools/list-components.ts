import { readScene } from "../utils/scene.js";
import { makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

export async function listComponents(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const scene = await readScene(projectDir);
  let components = Object.values(scene.components);

  const typeFilter = args.type as string | undefined;
  const nameFilter = args.name as string | undefined;
  const tagFilter = args.tag as string | undefined;
  const parentIdFilter = args.parentId as string | undefined;

  if (typeFilter) {
    components = components.filter((c) => c.type === typeFilter);
  }
  if (nameFilter) {
    const lower = nameFilter.toLowerCase();
    components = components.filter((c) => c.name?.toLowerCase().includes(lower));
  }
  if (tagFilter) {
    components = components.filter((c) => {
      const script = c.script as Record<string, unknown> | undefined;
      return script?.tag === tagFilter;
    });
  }
  if (parentIdFilter) {
    components = components.filter((c) => c.parentId === parentIdFilter);
  }

  const results = components.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    position: c.position,
    rotation: c.rotation,
    scale: c.scale,
    parentId: c.parentId,
  }));

  return makeSuccess(results);
}
