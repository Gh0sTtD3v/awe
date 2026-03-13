import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SceneData } from "../types.js";

vi.mock("../utils/file-io.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/file-io.js")>();
  return {
    ...actual,
    readJsonFile: vi.fn(),
    writeJsonFile: vi.fn(),
    fileExists: vi.fn(),
  };
});

vi.mock("../utils/paths.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/paths.js")>();
  return {
    ...actual,
    getVrmsData: vi.fn(),
  };
});

vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-001"),
}));

// Mock node:fs/promises for readdir in get_animations
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  rename: vi.fn(),
  access: vi.fn(),
  readdir: vi.fn().mockResolvedValue(["idle.json", "walk.json"]),
}));

import { readJsonFile, writeJsonFile, fileExists } from "../utils/file-io.js";
import { setPhysics } from "../tools/set-physics.js";
import { listPhysicsComponents } from "../tools/list-physics-components.js";
import { getAnimations } from "../tools/get-animations.js";
import { addAnimation } from "../tools/add-animation.js";
import { setLighting } from "../tools/set-lighting.js";
import { setEnvironment } from "../tools/set-environment.js";
import { setSpawn } from "../tools/set-spawn.js";

const mockReadJsonFile = vi.mocked(readJsonFile);
const mockWriteJsonFile = vi.mocked(writeJsonFile);
const mockFileExists = vi.mocked(fileExists);

function createScene(components: Record<string, unknown> = {}): SceneData {
  return { id: "scene-1", components: components as SceneData["components"] };
}

describe("set_physics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteJsonFile.mockResolvedValue(undefined);
  });

  it("adds collider", async () => {
    mockReadJsonFile.mockResolvedValue(createScene({
      "comp-1": { id: "comp-1", name: "Box", type: "mesh" },
    }));
    const result = await setPhysics({
      componentId: "comp-1",
      enabled: true,
      rigidbodyType: "DYNAMIC",
      colliderType: "CUBE",
    }, "/project");
    expect(result.isError).toBeUndefined();
    const writtenData = mockWriteJsonFile.mock.calls[0][1] as SceneData;
    expect(writtenData.components["comp-1"].collider).toBeDefined();
    expect(writtenData.components["comp-1"].collider!.rigidbodyType).toBe("DYNAMIC");
  });

  it("removes collider (enabled=false)", async () => {
    mockReadJsonFile.mockResolvedValue(createScene({
      "comp-1": {
        id: "comp-1", name: "Box", type: "mesh",
        collider: { rigidbodyType: "DYNAMIC", colliderType: "CUBE" },
      },
    }));
    const result = await setPhysics({ componentId: "comp-1", enabled: false }, "/project");
    expect(result.isError).toBeUndefined();
    const writtenData = mockWriteJsonFile.mock.calls[0][1] as SceneData;
    expect(writtenData.components["comp-1"].collider).toBeUndefined();
  });
});

describe("list_physics_components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only physics-enabled components", async () => {
    mockReadJsonFile.mockResolvedValue(createScene({
      "comp-1": {
        id: "comp-1", name: "Box", type: "mesh",
        collider: { rigidbodyType: "DYNAMIC", colliderType: "CUBE" },
      },
      "comp-2": { id: "comp-2", name: "Sphere", type: "mesh" },
    }));
    const result = await listPhysicsComponents({}, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    // Response format: { totalCount, countByType, groups }
    expect(data.totalCount).toBe(1);
  });
});

describe("get_animations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileExists.mockResolvedValue(true);
  });

  it("returns animation clips from vrm-anims component", async () => {
    mockReadJsonFile.mockResolvedValue(createScene({
      "vrm-anims-1": {
        id: "vrm-anims-1", name: "Animations", type: "vrm-anims",
        anims: {
          "anim-1": { name: "idle", fileName: "idle.fbx", loop: true },
          "anim-2": { name: "walk", fileName: "walk.fbx", loop: true },
        },
      },
    }));
    const result = await getAnimations({}, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.clips).toHaveLength(2);
    expect(data.availableFiles).toBeDefined();
  });
});

describe("add_animation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileExists.mockResolvedValue(true);
    mockWriteJsonFile.mockResolvedValue(undefined);
  });

  it("adds clip", async () => {
    mockReadJsonFile.mockResolvedValue({
      animations: [{ name: "idle", fileName: "idle.fbx", loop: true }],
    });
    const result = await addAnimation({ fileName: "run.fbx", name: "run", loop: true }, "/project");
    expect(result.isError).toBeUndefined();
  });

  it("validates required fields", async () => {
    const result = await addAnimation({ fileName: "run.fbx" }, "/project");
    expect(result.isError).toBe(true);
  });
});

describe("set_lighting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteJsonFile.mockResolvedValue(undefined);
  });

  it("applies day preset", async () => {
    mockReadJsonFile.mockResolvedValue(createScene());
    const result = await setLighting({ preset: "day" }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.modified.length).toBeGreaterThanOrEqual(1);
    // Light component should have ambient at root level
    const light = data.modified.find((c: Record<string, unknown>) => c.type === "light");
    expect(light).toBeDefined();
    expect(light.ambient).toBeDefined();
  });

  it("applies night preset with fog", async () => {
    mockReadJsonFile.mockResolvedValue(createScene());
    const result = await setLighting({ preset: "night" }, "/project");
    const data = JSON.parse(result.content[0].text);
    // Should have both light and fog
    expect(data.modified.length).toBeGreaterThanOrEqual(2);
  });

  it("applies custom values", async () => {
    mockReadJsonFile.mockResolvedValue(createScene());
    const result = await setLighting({
      ambient: { color: "#ff0000", intensity: 0.8 },
    }, "/project");
    expect(result.isError).toBeUndefined();
  });
});

describe("set_environment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteJsonFile.mockResolvedValue(undefined);
  });

  it("sets background", async () => {
    mockReadJsonFile.mockResolvedValue(createScene());
    const result = await setEnvironment({
      background: { type: "color", color: "#87CEEB" },
    }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.modified.length).toBeGreaterThanOrEqual(1);
  });

  it("sets envmap", async () => {
    mockReadJsonFile.mockResolvedValue(createScene());
    const result = await setEnvironment({
      envmap: { type: "image", imageId: "studio" },
    }, "/project");
    expect(result.isError).toBeUndefined();
  });

  it("sets postprocessing", async () => {
    mockReadJsonFile.mockResolvedValue(createScene());
    const result = await setEnvironment({
      postprocessing: { bloom: { intensity: 1, threshold: 0.8 } },
    }, "/project");
    expect(result.isError).toBeUndefined();
  });
});

describe("set_spawn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteJsonFile.mockResolvedValue(undefined);
  });

  it("creates spawn", async () => {
    mockReadJsonFile.mockResolvedValue(createScene());
    const result = await setSpawn({ position: { x: 0, y: 1, z: 0 } }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.type).toBe("spawn");
    expect(data.position).toEqual({ x: 0, y: 1, z: 0 });
  });

  it("updates existing spawn", async () => {
    mockReadJsonFile.mockResolvedValue(createScene({
      "spawn-1": { id: "spawn-1", name: "Spawn Point", type: "spawn", position: { x: 0, y: 0, z: 0 } },
    }));
    const result = await setSpawn({ position: { x: 5, y: 0, z: 5 } }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.position).toEqual({ x: 5, y: 0, z: 5 });
  });

  it("sets position/rotation and avatarId at root level", async () => {
    const { getVrmsData } = await import("../utils/paths.js");
    vi.mocked(getVrmsData).mockReturnValue([{ id: "avatar-1", name: "Robot" }]);
    mockReadJsonFile.mockResolvedValueOnce(createScene()); // scene
    const result = await setSpawn({
      position: { x: 0, y: 1, z: 0 },
      rotation: { x: 0, y: 90, z: 0 },
      avatarId: "avatar-1",
    }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.avatarId).toBe("avatar-1");
    // Should NOT be in data bag
    expect(data.data).toBeUndefined();
  });
});
