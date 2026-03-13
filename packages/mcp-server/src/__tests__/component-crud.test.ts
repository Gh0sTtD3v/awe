import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SceneData } from "../types.js";

// Mock file-io and scene utils
vi.mock("../utils/file-io.js", () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn(),
  fileExists: vi.fn(),
}));

// We need to mock uuid to get predictable IDs
vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-001"),
}));

import { readJsonFile, writeJsonFile } from "../utils/file-io.js";
import { addComponent } from "../tools/add-component.js";
import { updateComponent } from "../tools/update-component.js";
import { deleteComponent } from "../tools/delete-component.js";

const mockReadJsonFile = vi.mocked(readJsonFile);
const mockWriteJsonFile = vi.mocked(writeJsonFile);

function createMockScene(components: Record<string, unknown> = {}): SceneData {
  return {
    id: "scene-1",
    components: components as SceneData["components"],
  };
}

describe("add_component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteJsonFile.mockResolvedValue(undefined);
  });

  it("creates component with correct structure", async () => {
    mockReadJsonFile.mockResolvedValue(createMockScene());
    const result = await addComponent({ type: "mesh", name: "Box" }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.id).toBe("test-uuid-001");
    expect(data.name).toBe("Box");
    expect(data.type).toBe("mesh");
    expect(data.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(data.rotation).toEqual({ x: 0, y: 0, z: 0 });
    expect(data.scale).toEqual({ x: 1, y: 1, z: 1 });
  });

  it("validates type is required", async () => {
    const result = await addComponent({ name: "Box" }, "/project");
    expect(result.isError).toBe(true);
  });

  it("validates name is required", async () => {
    const result = await addComponent({ type: "mesh" }, "/project");
    expect(result.isError).toBe(true);
  });

  it("validates component type", async () => {
    const result = await addComponent({ type: "invalid", name: "X" }, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("INVALID_TYPE");
  });

  it("validates parent exists", async () => {
    mockReadJsonFile.mockResolvedValue(createMockScene());
    const result = await addComponent({ type: "mesh", name: "Box", parentId: "nonexistent" }, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("PARENT_NOT_FOUND");
  });

  it("defaults position/rotation/scale", async () => {
    mockReadJsonFile.mockResolvedValue(createMockScene());
    const result = await addComponent({ type: "mesh", name: "Box" }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(data.rotation).toEqual({ x: 0, y: 0, z: 0 });
    expect(data.scale).toEqual({ x: 1, y: 1, z: 1 });
  });

  it("spreads type-specific data at root level", async () => {
    mockReadJsonFile.mockResolvedValue(createMockScene());
    const result = await addComponent({
      type: "mesh",
      name: "Red Box",
      color: "#ff0000",
      geometry: { type: "box", boxParams: { width: 2, height: 2, depth: 2 } },
    }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.color).toBe("#ff0000");
    expect(data.geometry.type).toBe("box");
    expect(data.data).toBeUndefined();
  });

  it("backward-compat: spreads data bag at root level", async () => {
    mockReadJsonFile.mockResolvedValue(createMockScene());
    const result = await addComponent({
      type: "mesh",
      name: "Box",
      data: { color: "#00ff00", opacity: 0.5 },
    }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.color).toBe("#00ff00");
    expect(data.opacity).toBe(0.5);
  });
});

describe("update_component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteJsonFile.mockResolvedValue(undefined);
  });

  it("deep merges updates", async () => {
    mockReadJsonFile.mockResolvedValue(createMockScene({
      "comp-1": { id: "comp-1", name: "Box", type: "mesh", color: "#ffffff", position: { x: 0, y: 0, z: 0 } },
    }));
    const result = await updateComponent({ id: "comp-1", updates: { color: "#ff0000" } }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.color).toBe("#ff0000");
    expect(data.name).toBe("Box");
  });

  it("rejects id changes", async () => {
    mockReadJsonFile.mockResolvedValue(createMockScene({
      "comp-1": { id: "comp-1", name: "Box", type: "mesh" },
    }));
    const result = await updateComponent({ id: "comp-1", updates: { id: "new-id" } }, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("IMMUTABLE_FIELD");
  });

  it("rejects type changes", async () => {
    mockReadJsonFile.mockResolvedValue(createMockScene({
      "comp-1": { id: "comp-1", name: "Box", type: "mesh" },
    }));
    const result = await updateComponent({ id: "comp-1", updates: { type: "model" } }, "/project");
    expect(result.isError).toBe(true);
  });

  it("handles missing component", async () => {
    mockReadJsonFile.mockResolvedValue(createMockScene());
    const result = await updateComponent({ id: "nonexistent", updates: { name: "X" } }, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("COMPONENT_NOT_FOUND");
  });
});

describe("delete_component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteJsonFile.mockResolvedValue(undefined);
  });

  it("removes component", async () => {
    mockReadJsonFile.mockResolvedValue(createMockScene({
      "comp-1": { id: "comp-1", name: "Box", type: "mesh" },
    }));
    const result = await deleteComponent({ id: "comp-1" }, "/project");
    expect(result.isError).toBeUndefined();
    // Verify it was written without the component
    const writtenData = mockWriteJsonFile.mock.calls[0][1] as SceneData;
    expect(writtenData.components["comp-1"]).toBeUndefined();
  });

  it("recursive deletion of children", async () => {
    mockReadJsonFile.mockResolvedValue(createMockScene({
      "parent": { id: "parent", name: "Group", type: "group" },
      "child1": { id: "child1", name: "Child 1", type: "mesh", parentId: "parent" },
      "child2": { id: "child2", name: "Child 2", type: "mesh", parentId: "parent" },
      "grandchild": { id: "grandchild", name: "Grandchild", type: "mesh", parentId: "child1" },
    }));
    const result = await deleteComponent({ id: "parent", recursive: true }, "/project");
    expect(result.isError).toBeUndefined();
    const writtenData = mockWriteJsonFile.mock.calls[0][1] as SceneData;
    expect(Object.keys(writtenData.components)).toHaveLength(0);
  });

  it("handles missing component", async () => {
    mockReadJsonFile.mockResolvedValue(createMockScene());
    const result = await deleteComponent({ id: "nonexistent" }, "/project");
    expect(result.isError).toBe(true);
  });
});
