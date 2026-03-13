import type { ToolResponse, ErrorResponse } from "../types.js";

export function createError(code: string, message: string, suggestion?: string): ErrorResponse {
  return { error: true, code, message, ...(suggestion ? { suggestion } : {}) };
}

export function makeError(code: string, message: string, suggestion?: string): ToolResponse {
  return {
    content: [{ type: "text", text: JSON.stringify(createError(code, message, suggestion), null, 2) }],
    isError: true,
  };
}

export function makeSuccess(data: unknown): ToolResponse {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}
