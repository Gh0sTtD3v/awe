import { readScene } from "../utils/scene.js";
import { makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

export async function listPhysicsComponents(_args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const scene = await readScene(projectDir);

  const physicsComponents = Object.values(scene.components)
    .filter((c) => c.collider)
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      rigidbodyType: c.collider?.rigidbodyType,
      colliderType: c.collider?.colliderType,
      isSensor: c.collider?.isSensor,
      dynamicProps: c.collider?.dynamicProps,
    }));

  const byRigidbodyType: Record<string, typeof physicsComponents> = {};
  for (const comp of physicsComponents) {
    const rbType = comp.rigidbodyType ?? "UNSET";
    if (!byRigidbodyType[rbType]) byRigidbodyType[rbType] = [];
    byRigidbodyType[rbType].push(comp);
  }

  const counts: Record<string, number> = {};
  for (const [type, comps] of Object.entries(byRigidbodyType)) {
    counts[type] = comps.length;
  }

  return makeSuccess({
    totalCount: physicsComponents.length,
    countByType: counts,
    groups: byRigidbodyType,
  });
}
