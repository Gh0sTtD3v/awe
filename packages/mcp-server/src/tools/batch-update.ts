import { readScene, writeScene, deepMerge } from "../utils/scene.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

interface BatchItem {
  id: string;
  changes: Record<string, unknown>;
}

export async function batchUpdate(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const updates = args.updates as BatchItem[];
  if (!updates?.length) return makeError("MISSING_PARAM", "updates is required");

  if (updates.length > 50) {
    return makeError("BATCH_TOO_LARGE", "Maximum 50 updates per batch");
  }

  const scene = await readScene(projectDir);

  // Validate all IDs first
  const missingIds = updates.filter((u) => !scene.components[u.id]).map((u) => u.id);
  if (missingIds.length > 0) {
    return makeError("COMPONENT_NOT_FOUND", `Components not found: ${missingIds.join(", ")}`);
  }

  // Validate no immutable fields
  for (const update of updates) {
    if ("id" in update.changes) return makeError("IMMUTABLE_FIELD", `Cannot change id on component '${update.id}'`);
    if ("type" in update.changes) return makeError("IMMUTABLE_FIELD", `Cannot change type on component '${update.id}'`);
  }

  // Apply all updates
  for (const update of updates) {
    scene.components[update.id] = deepMerge(
      scene.components[update.id] as unknown as Record<string, unknown>,
      update.changes
    ) as typeof scene.components[string];
  }

  await writeScene(projectDir, scene);

  const updated = updates.map((u) => scene.components[u.id]);
  return makeSuccess(updated);
}
