import { describe, it, expect } from "vitest";
import { normalizeToArray } from "../utils/file-io.js";

describe("normalizeToArray", () => {
  it("passes through an array unchanged", () => {
    const input = [{ id: "a" }, { id: "b" }];
    const result = normalizeToArray(input);
    expect(result).toBe(input);
  });

  it("converts a keyed object to an array of its values", () => {
    const input = { foo: { id: "a" }, bar: { id: "b" } };
    const result = normalizeToArray(input);
    expect(result).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("returns empty array for empty object", () => {
    expect(normalizeToArray({})).toEqual([]);
  });

  it("returns empty array for empty array", () => {
    const input: unknown[] = [];
    expect(normalizeToArray(input)).toEqual([]);
  });
});
