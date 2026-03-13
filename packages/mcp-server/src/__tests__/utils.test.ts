import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateId, readScene, writeScene, deepMerge } from "../utils/scene.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import { resolveProjectPath } from "../utils/paths.js";

// Mock file-io module
vi.mock("../utils/file-io.js", () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn(),
  fileExists: vi.fn(),
}));

import { readJsonFile, writeJsonFile } from "../utils/file-io.js";

const mockReadJsonFile = vi.mocked(readJsonFile);
const mockWriteJsonFile = vi.mocked(writeJsonFile);

describe("generateId", () => {
  it("returns a valid UUID string", () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("returns unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe("deepMerge", () => {
  it("merges flat objects", () => {
    const result = deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 });
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("null deletes keys", () => {
    const result = deepMerge({ a: 1, b: 2 }, { b: null } as Record<string, unknown>);
    expect(result).toEqual({ a: 1 });
    expect("b" in result).toBe(false);
  });

  it("arrays are replaced, not merged", () => {
    const result = deepMerge({ tags: [1, 2, 3] }, { tags: [4, 5] });
    expect(result).toEqual({ tags: [4, 5] });
  });

  it("nested objects are deep merged", () => {
    const result = deepMerge(
      { position: { x: 1, y: 2, z: 3 } },
      { position: { x: 10 } }
    );
    expect(result).toEqual({ position: { x: 10, y: 2, z: 3 } });
  });

  it("does not mutate the target", () => {
    const target = { a: 1 };
    const result = deepMerge(target, { b: 2 });
    expect(target).toEqual({ a: 1 });
    expect(result).toEqual({ a: 1, b: 2 });
  });
});

describe("readScene", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles valid JSON with components map", async () => {
    mockReadJsonFile.mockResolvedValue({
      id: "scene-1",
      components: {
        "comp-1": { id: "comp-1", name: "Box", type: "mesh" },
      },
    });

    const scene = await readScene("/project");
    expect(scene.id).toBe("scene-1");
    expect(scene.components["comp-1"].name).toBe("Box");
  });

  it("handles array format (items)", async () => {
    mockReadJsonFile.mockResolvedValue({
      items: [
        { id: "comp-1", name: "Box", type: "mesh" },
        { id: "comp-2", name: "Sphere", type: "mesh" },
      ],
    });

    const scene = await readScene("/project");
    expect(Object.keys(scene.components)).toHaveLength(2);
    expect(scene.components["comp-1"].name).toBe("Box");
    expect(scene.components["comp-2"].name).toBe("Sphere");
  });

  it("handles missing components/items", async () => {
    mockReadJsonFile.mockResolvedValue({});

    const scene = await readScene("/project");
    expect(scene.components).toEqual({});
  });

  it("throws on missing file", async () => {
    mockReadJsonFile.mockRejectedValue(new Error("ENOENT: no such file"));
    await expect(readScene("/project")).rejects.toThrow("ENOENT");
  });
});

describe("writeScene", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes valid JSON and sets updatedAt", async () => {
    const before = Date.now();
    await writeScene("/project", {
      id: "scene-1",
      components: {},
    });

    expect(mockWriteJsonFile).toHaveBeenCalledTimes(1);
    const [, data] = mockWriteJsonFile.mock.calls[0];
    const written = data as Record<string, unknown>;
    expect(written.id).toBe("scene-1");
    expect(typeof written.updatedAt).toBe("number");
    expect(written.updatedAt as number).toBeGreaterThanOrEqual(before);
  });
});

describe("makeSuccess", () => {
  it("returns correct response format", () => {
    const result = makeSuccess({ count: 5 });
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.count).toBe(5);
  });
});

describe("makeError", () => {
  it("returns correct error response format", () => {
    const result = makeError("NOT_FOUND", "Component not found", "Check the ID");
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe(true);
    expect(parsed.code).toBe("NOT_FOUND");
    expect(parsed.message).toBe("Component not found");
    expect(parsed.suggestion).toBe("Check the ID");
  });

  it("omits suggestion when not provided", () => {
    const result = makeError("ERR", "error message");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.suggestion).toBeUndefined();
  });
});

describe("resolveProjectPath", () => {
  it("resolves valid paths", () => {
    const result = resolveProjectPath("/project", "public", "data", "scene.json");
    expect(result).toBe("/project/public/data/scene.json");
  });

  it("rejects path traversal", () => {
    expect(() => resolveProjectPath("/project", "..", "etc", "passwd")).toThrow("Path traversal detected");
  });

  it("rejects double dot traversal", () => {
    expect(() => resolveProjectPath("/project", "public", "../../etc")).toThrow("Path traversal detected");
  });
});
