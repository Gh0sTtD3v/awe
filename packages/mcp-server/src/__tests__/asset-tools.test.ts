import { describe, it, expect, vi, beforeEach } from "vitest";

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
    getLibrary3DData: vi.fn(),
    getVrmsData: vi.fn(),
  };
});

vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-001"),
}));

// Mock node:fs/promises for upload_asset
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  rename: vi.fn(),
  access: vi.fn(),
  copyFile: vi.fn(),
  stat: vi.fn(),
  mkdir: vi.fn(),
}));

import { readJsonFile, writeJsonFile, fileExists } from "../utils/file-io.js";
import { getLibrary3DData, getVrmsData } from "../utils/paths.js";
import { listModels } from "../tools/list-models.js";
import { listAvatars } from "../tools/list-avatars.js";
import { listUploads } from "../tools/list-uploads.js";
import { searchAssets } from "../tools/search-assets.js";
import { addModelToScene } from "../tools/add-model-to-scene.js";
import { addAvatarToScene } from "../tools/add-avatar-to-scene.js";
import { uploadAsset } from "../tools/upload-asset.js";

const mockReadJsonFile = vi.mocked(readJsonFile);
const mockWriteJsonFile = vi.mocked(writeJsonFile);
const mockFileExists = vi.mocked(fileExists);
const mockGetLibrary3DData = vi.mocked(getLibrary3DData);
const mockGetVrmsData = vi.mocked(getVrmsData);

const mockModels = [
  { id: "m1", name: "Tree", slug: "tree", hash: "abc123", source: { name: "Nature", slug: "nature" }, url: "/assets/tree.glb" },
  { id: "m2", name: "Rock", slug: "rock", hash: "def456", source: { name: "Nature", slug: "nature" }, url: "/assets/rock.glb" },
  { id: "m3", name: "Chair", slug: "chair", hash: "ghi789", source: { name: "Furniture", slug: "furniture" }, url: "/assets/chair.glb" },
];

const mockAvatars = [
  { id: "a1", name: "Robot", url: "/assets/robot.vrm", hidden: false },
  { id: "a2", name: "Human", url: "/assets/human.vrm", hidden: false },
  { id: "a3", name: "Test Avatar", url: "/assets/test.vrm", hidden: true },
];

const mockAvatarsKeyed: Record<string, (typeof mockAvatars)[number]> = {
  robot: mockAvatars[0],
  human: mockAvatars[1],
  test_avatar: mockAvatars[2],
};

const mockUploads = [
  { id: "u1", name: "texture.png", mimeType: "image/png", path: "/assets/texture.png" },
  { id: "u2", name: "model.glb", mimeType: "model/gltf-binary", path: "/assets/model.glb" },
];

describe("list_models", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLibrary3DData.mockReturnValue(mockModels);
  });

  it("returns models", async () => {
    const result = await listModels({}, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    // Response format: { totalCount, results }
    expect(data.totalCount).toBeGreaterThanOrEqual(1);
    expect(data.results.length).toBeGreaterThanOrEqual(1);
  });

  it("search filter works", async () => {
    const result = await listModels({ search: "tree" }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.results.length).toBeGreaterThanOrEqual(1);
    expect(data.results[0].name.toLowerCase()).toContain("tree");
  });

  it("pagination works", async () => {
    const result = await listModels({ limit: 1, offset: 0 }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.results.length).toBeLessThanOrEqual(1);
  });

});

describe("list_avatars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVrmsData.mockReturnValue(mockAvatars);
  });

  it("returns avatars", async () => {
    const result = await listAvatars({}, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    // Response format: { count, results }
    expect(data.count).toBeGreaterThanOrEqual(1);
    expect(data.results.length).toBeGreaterThanOrEqual(1);
  });

  it("search filter works", async () => {
    const result = await listAvatars({ search: "robot" }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.results.length).toBeGreaterThanOrEqual(1);
  });

  it("handles keyed-object vrms.json", async () => {
    mockGetVrmsData.mockReturnValue(mockAvatarsKeyed);
    const result = await listAvatars({}, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.count).toBeGreaterThanOrEqual(1);
    expect(data.results.length).toBeGreaterThanOrEqual(1);
  });

  it("includeHidden flag", async () => {
    const resultWithoutHidden = await listAvatars({}, "/project");
    const dataWithout = JSON.parse(resultWithoutHidden.content[0].text);

    const resultWithHidden = await listAvatars({ includeHidden: true }, "/project");
    const dataWith = JSON.parse(resultWithHidden.content[0].text);

    expect(dataWith.count).toBeGreaterThanOrEqual(dataWithout.count);
  });
});

describe("list_uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileExists.mockResolvedValue(true);
    mockReadJsonFile.mockResolvedValue(mockUploads);
  });

  it("returns uploads", async () => {
    const result = await listUploads({}, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    // Response format: { count, results }
    expect(data.count).toBeGreaterThanOrEqual(1);
    expect(data.results.length).toBeGreaterThanOrEqual(1);
  });

  it("mimeType filter works", async () => {
    const result = await listUploads({ mimeType: "image/" }, "/project");
    const data = JSON.parse(result.content[0].text);
    for (const asset of data.results) {
      expect(asset.mimeType).toMatch(/^image\//);
    }
  });

  it("search filter works", async () => {
    const result = await listUploads({ search: "texture" }, "/project");
    const data = JSON.parse(result.content[0].text);
    expect(data.results.length).toBeGreaterThanOrEqual(1);
  });
});

describe("search_assets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileExists.mockResolvedValue(true);
    mockGetLibrary3DData.mockReturnValue(mockModels);
    mockGetVrmsData.mockReturnValue(mockAvatars);
  });

  it("cross-searches models and avatars", async () => {
    mockReadJsonFile.mockResolvedValueOnce(mockUploads);

    const result = await searchAssets({ query: "ro" }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.results.length).toBeGreaterThanOrEqual(1);
  });

  it("handles keyed-object vrms.json in search", async () => {
    mockGetVrmsData.mockReturnValue(mockAvatarsKeyed);
    mockReadJsonFile.mockResolvedValueOnce(mockUploads);

    const result = await searchAssets({ query: "robot" }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.results.some((r: { name: string }) => r.name === "Robot")).toBe(true);
  });
});

describe("add_model_to_scene", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLibrary3DData.mockReturnValue(mockModels);
    mockWriteJsonFile.mockResolvedValue(undefined);
  });

  it("looks up model and creates component with root-level props", async () => {
    mockReadJsonFile.mockResolvedValueOnce({ components: {} });

    const result = await addModelToScene({ modelId: "m1" }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.type).toBe("model");
    // url/hash should be at root, NOT in data bag
    expect(data.url).toBe("/assets/tree.glb");
    expect(data.hash).toBe("abc123");
    expect(data.data).toBeUndefined();
  });

  it("handles missing model", async () => {
    const result = await addModelToScene({ modelId: "nonexistent" }, "/project");
    expect(result.isError).toBe(true);
  });
});

describe("add_avatar_to_scene", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVrmsData.mockReturnValue(mockAvatars);
    mockWriteJsonFile.mockResolvedValue(undefined);
  });

  it("looks up avatar and creates component with root-level props", async () => {
    mockReadJsonFile.mockResolvedValueOnce({ components: {} });

    const result = await addAvatarToScene({ avatarId: "a1" }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.type).toBe("avatar");
    // url should be at root, NOT in data bag
    expect(data.url).toBe("/assets/robot.vrm");
    expect(data.data).toBeUndefined();
  });

  it("handles missing avatar", async () => {
    const result = await addAvatarToScene({ avatarId: "nonexistent" }, "/project");
    expect(result.isError).toBe(true);
  });

  it("handles keyed-object vrms.json", async () => {
    mockGetVrmsData.mockReturnValue(mockAvatarsKeyed);
    mockReadJsonFile.mockResolvedValueOnce({ components: {} });

    const result = await addAvatarToScene({ avatarId: "a1" }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.type).toBe("avatar");
    expect(data.url).toBe("/assets/robot.vrm");
  });
});

describe("upload_asset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileExists.mockResolvedValue(true);
    mockWriteJsonFile.mockResolvedValue(undefined);
  });

  it("rejects missing sourcePath", async () => {
    const result = await uploadAsset({}, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("MISSING_PARAM");
  });

  it("rejects missing source file", async () => {
    mockFileExists.mockResolvedValue(false);
    const result = await uploadAsset({ sourcePath: "missing.glb" }, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("FILE_NOT_FOUND");
  });

  it("rejects unsupported file extension", async () => {
    const result = await uploadAsset({ sourcePath: "file.txt" }, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("UNSUPPORTED_FORMAT");
  });

  it("uploads new asset and returns entry", async () => {
    const { readFile, copyFile, mkdir } = await import("node:fs/promises");
    vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-glb-data"));
    vi.mocked(copyFile).mockResolvedValue(undefined);
    vi.mocked(mkdir).mockResolvedValue(undefined);
    // fileExists: true for source, false for uploaded_assets.json
    mockFileExists
      .mockResolvedValueOnce(true)   // source file exists
      .mockResolvedValueOnce(false); // uploaded_assets.json doesn't exist yet
    mockReadJsonFile.mockResolvedValue([]);

    const result = await uploadAsset({ sourcePath: "model.glb", name: "My Model" }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.name).toBe("My Model");
    expect(data.mimeType).toBe("model/gltf-binary");
    expect(data.url).toMatch(/^\/assets\/uploaded-assets-/);
    expect(data.hash).toBeDefined();
  });

  it("deduplicates by hash", async () => {
    const { readFile } = await import("node:fs/promises");
    vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-data"));
    const { createHash } = await import("node:crypto");
    const expectedHash = createHash("sha256").update(Buffer.from("fake-data")).digest("hex");

    mockFileExists.mockResolvedValue(true);
    mockReadJsonFile.mockResolvedValue([
      { hash: expectedHash, url: "/assets/existing.png", name: "Existing", mimeType: "image/png", createdAt: 1000 },
    ]);

    const result = await uploadAsset({ sourcePath: "texture.png" }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    // Should return existing entry, not create new one
    expect(data.url).toBe("/assets/existing.png");
    expect(data.name).toBe("Existing");
  });
});
