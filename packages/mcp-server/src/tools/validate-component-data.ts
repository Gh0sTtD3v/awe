import { componentSchemas } from "../schemas/component-schemas.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

export async function validateComponentData(
  args: Record<string, unknown>,
  _projectDir: string
): Promise<ToolResponse> {
  const type = args.type as string;
  const data = args.data as Record<string, unknown>;

  if (!type) return makeError("MISSING_PARAM", "type is required");
  if (!data || typeof data !== "object") return makeError("MISSING_PARAM", "data is required and must be an object");

  const schema = componentSchemas[type];
  if (!schema) {
    return makeError(
      "UNKNOWN_TYPE",
      `Unknown component type '${type}'`,
      `Available types: ${Object.keys(componentSchemas).join(", ")}`
    );
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for unknown properties
  const knownProps = new Set(Object.keys(schema.properties));
  // Also allow common component properties that aren't type-specific
  const commonProps = new Set(["name", "position", "rotation", "scale", "parentId", "collider", "script"]);
  for (const key of Object.keys(data)) {
    if (!knownProps.has(key) && !commonProps.has(key)) {
      warnings.push(`Unknown property '${key}' for type '${type}'`);
    }
  }

  // Validate known properties
  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    const value = data[propName];
    if (value === undefined) continue; // optional

    const propType = propSchema.type;

    if (propType === "string" && typeof value !== "string") {
      errors.push(`Property '${propName}' should be a string, got ${typeof value}`);
    } else if (propType === "number" && typeof value !== "number") {
      errors.push(`Property '${propName}' should be a number, got ${typeof value}`);
    } else if (propType === "boolean" && typeof value !== "boolean") {
      errors.push(`Property '${propName}' should be a boolean, got ${typeof value}`);
    } else if (propType === "object" && (typeof value !== "object" || value === null || Array.isArray(value))) {
      errors.push(`Property '${propName}' should be an object, got ${Array.isArray(value) ? "array" : typeof value}`);
    } else if (propType === "array" && !Array.isArray(value)) {
      errors.push(`Property '${propName}' should be an array, got ${typeof value}`);
    } else if (propType === "string[]" && !Array.isArray(value)) {
      errors.push(`Property '${propName}' should be a string array, got ${typeof value}`);
    } else if (propType === "XYZ[]" && !Array.isArray(value)) {
      errors.push(`Property '${propName}' should be an array of {x,y,z} objects, got ${typeof value}`);
    } else if (propType === "string | { url: string }") {
      if (typeof value !== "string" && (typeof value !== "object" || value === null || !("url" in (value as object)))) {
        errors.push(`Property '${propName}' should be a string URL or { url: string }, got ${typeof value}`);
      }
    } else if (propType === "string | string[]") {
      if (typeof value !== "string" && !Array.isArray(value)) {
        errors.push(`Property '${propName}' should be a string or string array, got ${typeof value}`);
      }
    }

    // Validate specific enum-like properties
    if (propName === "renderMode" && typeof value === "string") {
      if (!["default", "wireframe", "dome"].includes(value)) {
        errors.push(`Property 'renderMode' must be 'default', 'wireframe', or 'dome', got '${value}'`);
      }
    }
    if (propName === "align" && typeof value === "string") {
      if (!["left", "center", "right"].includes(value)) {
        errors.push(`Property 'align' must be 'left', 'center', or 'right', got '${value}'`);
      }
    }
    if (propName === "textTransform" && typeof value === "string") {
      if (!["none", "uppercase", "lowercase", "capitalize", "togglecase"].includes(value)) {
        errors.push(`Property 'textTransform' must be 'none', 'uppercase', 'lowercase', 'capitalize', or 'togglecase', got '${value}'`);
      }
    }

    // Validate geometry object structure for mesh
    if (propName === "geometry" && typeof value === "object" && value !== null) {
      const geo = value as Record<string, unknown>;
      if (!geo.type) {
        errors.push("Property 'geometry' requires a 'type' field ('box', 'sphere', 'cylinder', 'plane', or 'dome')");
      } else if (typeof geo.type === "string" && !["box", "sphere", "cylinder", "plane", "dome"].includes(geo.type)) {
        errors.push(`Property 'geometry.type' must be 'box', 'sphere', 'cylinder', 'plane', or 'dome', got '${geo.type}'`);
      }
    }

    // Validate opacity range
    if (propName === "opacity" && typeof value === "number") {
      if (value < 0 || value > 1) {
        warnings.push(`Property 'opacity' is typically 0-1, got ${value}`);
      }
    }
  }

  if (errors.length > 0) {
    return makeSuccess({
      valid: false,
      errors,
      warnings,
      schema: { type: schema.type, properties: Object.keys(schema.properties) },
      example: schema.example,
    });
  }

  return makeSuccess({
    valid: true,
    warnings,
  });
}
