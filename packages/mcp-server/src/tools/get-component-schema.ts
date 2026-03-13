import { componentSchemas } from "../schemas/component-schemas.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

export async function getComponentSchema(args: Record<string, unknown>, _projectDir: string): Promise<ToolResponse> {
  const type = args.type as string;
  if (!type) return makeError("MISSING_PARAM", "type is required");

  const schema = componentSchemas[type];
  if (!schema) {
    return makeError("UNKNOWN_TYPE", `Unknown component type '${type}'`, `Available types: ${Object.keys(componentSchemas).join(", ")}`);
  }

  return makeSuccess(schema);
}
