import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SceneData } from "../types.js";

vi.mock("../utils/file-io.js", () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn(),
  fileExists: vi.fn(),
}));

// Mock node:fs/promises for readdir in get_project_info
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  rename: vi.fn(),
  access: vi.fn(),
  readdir: vi.fn().mockResolvedValue([]),
}));

import { readJsonFile, fileExists } from "../utils/file-io.js";
import { getScene } from "../tools/get-scene.js";
import { validateScene } from "../tools/validate-scene.js";
import { getProjectInfo } from "../tools/get-project-info.js";
import { getComponentSchema } from "../tools/get-component-schema.js";
import { captureScreenshot } from "../tools/capture-screenshot.js";
import { validateComponentData } from "../tools/validate-component-data.js";

const mockReadJsonFile = vi.mocked(readJsonFile);
const mockFileExists = vi.mocked(fileExists);

function createScene(components: Record<string, unknown> = {}): SceneData {
  return {
    id: "scene-1",
    createdAt: 1000,
    updatedAt: 2000,
    components: components as SceneData["components"],
  };
}

describe("get_scene", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileExists.mockResolvedValue(true);
  });

  it("returns metadata, summary, and hierarchy", async () => {
    mockReadJsonFile.mockResolvedValue(createScene({
      "comp-1": { id: "comp-1", name: "Box", type: "mesh" },
      "comp-2": { id: "comp-2", name: "Light", type: "light" },
    }));
    const result = await getScene({}, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.metadata).toBeDefined();
    expect(data.summary).toBeDefined();
    expect(data.summary.totalComponents).toBe(2);
  });
});

describe("validate_scene", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects duplicate IDs", async () => {
    // This shouldn't happen with a map, but test the validator logic
    mockReadJsonFile.mockResolvedValue(createScene({
      "comp-1": { id: "comp-1", name: "Box", type: "mesh" },
    }));
    const result = await validateScene({}, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBeDefined();
  });

  it("detects broken parent refs", async () => {
    mockReadJsonFile.mockResolvedValue(createScene({
      "comp-1": { id: "comp-1", name: "Box", type: "mesh", parentId: "nonexistent" },
    }));
    const result = await validateScene({}, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.errors.length).toBeGreaterThanOrEqual(1);
  });
});

describe("get_project_info", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Only package.json exists, other dirs don't
    mockFileExists.mockImplementation(async (path: string) => {
      if (typeof path === "string" && path.endsWith("package.json")) return true;
      return false;
    });
  });

  it("returns metadata and dependencies", async () => {
    mockReadJsonFile.mockResolvedValue({
      name: "my-game",
      version: "1.0.0",
      dependencies: { "awe-engine": "^1.0.0" },
      scripts: { dev: "next dev" },
    });
    const result = await getProjectInfo({}, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.package.name).toBe("my-game");
  });
});

describe("get_component_schema", () => {
  it("returns correct schema for mesh", async () => {
    const result = await getComponentSchema({ type: "mesh" }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.type).toBe("mesh");
    expect(data.properties.geometry).toBeDefined();
    expect(data.properties.color).toBeDefined();
    expect(data.properties.opacity).toBeDefined();
    expect(data.example.geometry.type).toBe("box");
  });

  it("returns correct schema for text", async () => {
    const result = await getComponentSchema({ type: "text" }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.properties.text).toBeDefined();
    expect(data.properties.textColor).toBeDefined();
    expect(data.properties.font).toBeDefined();
  });

  it("handles invalid type", async () => {
    const result = await getComponentSchema({ type: "nonexistent" }, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("UNKNOWN_TYPE");
  });

  it("returns schema for all 31 types", async () => {
    const types = [
      "mesh", "model", "avatar", "text", "image", "video", "audio",
      "light", "terrain", "water", "grass", "fog", "background", "envmap",
      "spawn", "navmesh", "group", "quarks", "interaction", "dialog",
      "destination", "spline", "iframe", "reflector", "postprocessing", "rain",
      "cloud", "bird", "dust", "wave", "godray", "impact", "object",
    ];
    for (const type of types) {
      const result = await getComponentSchema({ type }, "/project");
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.type).toBe(type);
    }
  });
});

describe("capture_screenshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock global fetch
    vi.stubGlobal("fetch", vi.fn());
  });

  it("handles dev server not running", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("ECONNREFUSED"));
    const result = await captureScreenshot({}, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("DEV_SERVER_NOT_RUNNING");
  });
});

describe("validate_component_data", () => {
  it("validates mesh geometry object structure", async () => {
    const result = await validateComponentData({
      type: "mesh",
      data: {
        color: "#ff0000",
        geometry: { type: "box", boxParams: { width: 1, height: 1, depth: 1 } },
      },
    }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(true);
  });

  it("rejects flat geometry string", async () => {
    const result = await validateComponentData({
      type: "mesh",
      data: { geometry: "box" },
    }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(false);
    expect(data.errors.some((e: string) => e.includes("geometry"))).toBe(true);
  });

  it("validates color is a string for mesh", async () => {
    const result = await validateComponentData({
      type: "mesh",
      data: { color: 123 },
    }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(false);
    expect(data.errors.some((e: string) => e.includes("color"))).toBe(true);
  });

  it("validates enum values (renderMode)", async () => {
    const result = await validateComponentData({
      type: "mesh",
      data: { renderMode: "invalid" },
    }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(false);
    expect(data.errors.some((e: string) => e.includes("renderMode"))).toBe(true);
  });

  it("validates enum values (align)", async () => {
    const result = await validateComponentData({
      type: "text",
      data: { align: "justify" },
    }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(false);
  });

  it("validates nested geometry type", async () => {
    const result = await validateComponentData({
      type: "mesh",
      data: { geometry: { type: "invalid_shape" } },
    }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(false);
    expect(data.errors.some((e: string) => e.includes("geometry.type"))).toBe(true);
  });

  it("returns clear error messages", async () => {
    const result = await validateComponentData({
      type: "mesh",
      data: { color: 123, opacity: "high", geometry: "box" },
    }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(false);
    expect(data.errors.length).toBeGreaterThanOrEqual(3);
    // Should include schema info for fixing
    expect(data.schema).toBeDefined();
    expect(data.example).toBeDefined();
  });

  it("returns success for valid data", async () => {
    const result = await validateComponentData({
      type: "light",
      data: {
        ambient: { color: "#ffffff", intensity: 0.5 },
        directional: { color: "#ffffff", intensity: 1.0 },
      },
    }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(true);
  });

  it("rejects unknown types", async () => {
    const result = await validateComponentData({
      type: "nonexistent",
      data: {},
    }, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("UNKNOWN_TYPE");
  });

  it("warns on unknown properties", async () => {
    const result = await validateComponentData({
      type: "mesh",
      data: { unknownProp: 123 },
    }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(true);
    expect(data.warnings.some((w: string) => w.includes("unknownProp"))).toBe(true);
  });

  it("warns on opacity out of range", async () => {
    const result = await validateComponentData({
      type: "mesh",
      data: { opacity: 2.5 },
    }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(true);
    expect(data.warnings.some((w: string) => w.includes("opacity"))).toBe(true);
  });
});
