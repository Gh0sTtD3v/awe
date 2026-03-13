import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SceneData, SceneComponent } from "../types.js";

vi.mock("../utils/file-io.js", () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn(),
  fileExists: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-001"),
}));

import { readJsonFile, writeJsonFile } from "../utils/file-io.js";
import { duplicateComponent } from "../tools/duplicate-component.js";
import { getComponent } from "../tools/get-component.js";
import { listComponents } from "../tools/list-components.js";
import { moveComponent } from "../tools/move-component.js";
import { groupComponents } from "../tools/group-components.js";
import { batchUpdate } from "../tools/batch-update.js";

const mockReadJsonFile = vi.mocked(readJsonFile);
const mockWriteJsonFile = vi.mocked(writeJsonFile);

function createScene(components: Record<string, Partial<SceneComponent>> = {}): SceneData {
  return {
    id: "scene-1",
    components: components as SceneData["components"],
  };
}

describe("duplicate_component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteJsonFile.mockResolvedValue(undefined);
  });

  it("clones with new ID and applies offset", async () => {
    mockReadJsonFile.mockResolvedValue(createScene({
      "comp-1": { id: "comp-1", name: "Box", type: "mesh", position: { x: 0, y: 0, z: 0 }, color: "#ff0000" },
    }));
    const result = await duplicateComponent({ id: "comp-1" }, "/project");
    expect(result.isError).toBeUndefined();
    // duplicateComponent returns an array of cloned components
    const data = JSON.parse(result.content[0].text);
    const root = data[0];
    expect(root.id).toBe("test-uuid-001");
    expect(root.name).toContain("copy");
    expect(root.type).toBe("mesh");
    expect(root.position.x).toBe(2); // default offset
  });

  it("uses custom name", async () => {
    mockReadJsonFile.mockResolvedValue(createScene({
      "comp-1": { id: "comp-1", name: "Box", type: "mesh", position: { x: 0, y: 0, z: 0 } },
    }));
    const result = await duplicateComponent({ id: "comp-1", newName: "My Clone" }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data[0].name).toBe("My Clone");
  });

  it("handles missing component", async () => {
    mockReadJsonFile.mockResolvedValue(createScene());
    const result = await duplicateComponent({ id: "nonexistent" }, "/project");
    expect(result.isError).toBe(true);
  });
});

describe("get_component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns full details", async () => {
    mockReadJsonFile.mockResolvedValue(createScene({
      "comp-1": { id: "comp-1", name: "Box", type: "mesh", color: "#ff0000" },
    }));
    const result = await getComponent({ id: "comp-1" }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.id).toBe("comp-1");
    expect(data.name).toBe("Box");
  });

  it("handles missing component", async () => {
    mockReadJsonFile.mockResolvedValue(createScene());
    const result = await getComponent({ id: "nonexistent" }, "/project");
    expect(result.isError).toBe(true);
  });
});

describe("list_components", () => {
  const sceneWithComponents = createScene({
    "mesh-1": { id: "mesh-1", name: "Box", type: "mesh" },
    "mesh-2": { id: "mesh-2", name: "Sphere", type: "mesh" },
    "light-1": { id: "light-1", name: "Sun", type: "light" },
    "child-1": { id: "child-1", name: "Child", type: "mesh", parentId: "mesh-1" },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockReadJsonFile.mockResolvedValue(sceneWithComponents);
  });

  it("filters by type", async () => {
    const result = await listComponents({ type: "light" }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveLength(1);
    expect(data[0].type).toBe("light");
  });

  it("filters by name", async () => {
    const result = await listComponents({ name: "box" }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].name).toBe("Box");
  });

  it("filters by parentId", async () => {
    const result = await listComponents({ parentId: "mesh-1" }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("child-1");
  });
});

describe("move_component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteJsonFile.mockResolvedValue(undefined);
  });

  it("reparents a component", async () => {
    mockReadJsonFile.mockResolvedValue(createScene({
      "group-1": { id: "group-1", name: "Group", type: "group" },
      "comp-1": { id: "comp-1", name: "Box", type: "mesh" },
    }));
    const result = await moveComponent({ id: "comp-1", newParentId: "group-1" }, "/project");
    expect(result.isError).toBeUndefined();
    const writtenData = mockWriteJsonFile.mock.calls[0][1] as SceneData;
    expect(writtenData.components["comp-1"].parentId).toBe("group-1");
  });

  it("handles null parent (move to root)", async () => {
    mockReadJsonFile.mockResolvedValue(createScene({
      "group-1": { id: "group-1", name: "Group", type: "group" },
      "comp-1": { id: "comp-1", name: "Box", type: "mesh", parentId: "group-1" },
    }));
    const result = await moveComponent({ id: "comp-1", newParentId: null }, "/project");
    expect(result.isError).toBeUndefined();
  });
});

describe("group_components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteJsonFile.mockResolvedValue(undefined);
  });

  it("creates group and reparents all", async () => {
    mockReadJsonFile.mockResolvedValue(createScene({
      "comp-1": { id: "comp-1", name: "Box", type: "mesh", position: { x: 0, y: 0, z: 0 } },
      "comp-2": { id: "comp-2", name: "Sphere", type: "mesh", position: { x: 4, y: 0, z: 0 } },
    }));
    const result = await groupComponents({ componentIds: ["comp-1", "comp-2"], groupName: "My Group" }, "/project");
    expect(result.isError).toBeUndefined();
    const writtenData = mockWriteJsonFile.mock.calls[0][1] as SceneData;
    // Children should have the new group as parent
    expect(writtenData.components["comp-1"].parentId).toBe("test-uuid-001");
    expect(writtenData.components["comp-2"].parentId).toBe("test-uuid-001");
    // Group should exist
    expect(writtenData.components["test-uuid-001"].type).toBe("group");
    expect(writtenData.components["test-uuid-001"].name).toBe("My Group");
  });

  it("validates IDs exist", async () => {
    mockReadJsonFile.mockResolvedValue(createScene({
      "comp-1": { id: "comp-1", name: "Box", type: "mesh" },
    }));
    const result = await groupComponents({ componentIds: ["comp-1", "nonexistent"], groupName: "Group" }, "/project");
    expect(result.isError).toBe(true);
  });
});

describe("batch_update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteJsonFile.mockResolvedValue(undefined);
  });

  it("updates multiple components", async () => {
    mockReadJsonFile.mockResolvedValue(createScene({
      "comp-1": { id: "comp-1", name: "Box", type: "mesh", color: "#ffffff" },
      "comp-2": { id: "comp-2", name: "Sphere", type: "mesh", color: "#ffffff" },
    }));
    const result = await batchUpdate({
      updates: [
        { id: "comp-1", changes: { color: "#ff0000" } },
        { id: "comp-2", changes: { color: "#00ff00" } },
      ],
    }, "/project");
    expect(result.isError).toBeUndefined();
  });

  it("validates max 50 updates", async () => {
    const updates = Array.from({ length: 51 }, (_, i) => ({ id: `comp-${i}`, changes: { name: "X" } }));
    const result = await batchUpdate({ updates }, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("BATCH_TOO_LARGE");
  });

  it("rejects immutable fields", async () => {
    mockReadJsonFile.mockResolvedValue(createScene({
      "comp-1": { id: "comp-1", name: "Box", type: "mesh" },
    }));
    const result = await batchUpdate({
      updates: [{ id: "comp-1", changes: { id: "new-id" } }],
    }, "/project");
    expect(result.isError).toBe(true);
  });
});
