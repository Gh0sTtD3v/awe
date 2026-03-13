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

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  rename: vi.fn(),
  access: vi.fn(),
  copyFile: vi.fn(),
  stat: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock("@oncyberio/asset-optimizer/dist/index.js", () => ({
  OptimizeService: {
    optimizeAsset: vi.fn(),
    optimizeVRM: vi.fn(),
  },
}));

import { fileExists } from "../utils/file-io.js";
import { optimizeModel } from "../tools/optimize-model.js";
import { optimizeVrm } from "../tools/optimize-vrm.js";
import { OptimizeService } from "@oncyberio/asset-optimizer/dist/index.js";

const mockFileExists = vi.mocked(fileExists);
const mockOptimizeAsset = vi.mocked(OptimizeService.optimizeAsset);
const mockOptimizeVRM = vi.mocked(OptimizeService.optimizeVRM);

describe("optimize_model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing assetPath", async () => {
    const result = await optimizeModel({}, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("MISSING_PARAM");
  });

  it("rejects unsupported file extension", async () => {
    const result = await optimizeModel({ assetPath: "/assets/model.fbx" }, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("UNSUPPORTED_FORMAT");
  });

  it("rejects file not found", async () => {
    mockFileExists.mockResolvedValue(false);
    const result = await optimizeModel({ assetPath: "/assets/missing.glb" }, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("FILE_NOT_FOUND");
  });

  it("returns optimization result on success", async () => {
    mockFileExists.mockResolvedValue(true);
    const mockResult = {
      hash: "abc123",
      raw: "/assets/optimized/abc123_v0.glb",
      optimized: {
        high: "/assets/optimized/abc123_v0_high.glb",
        low: "/assets/optimized/abc123_v0_low.glb",
        low_compressed: "/assets/optimized/abc123_v0_low_compressed.glb",
      },
      propertyId: "optimized",
    };
    mockOptimizeAsset.mockResolvedValue(mockResult);

    const result = await optimizeModel({ assetPath: "/assets/tree.glb" }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.hash).toBe("abc123");
    expect(data.optimized.high).toBeDefined();
    expect(data.optimized.low).toBeDefined();
    expect(data.optimized.low_compressed).toBeDefined();
  });

  it("passes compression options correctly", async () => {
    mockFileExists.mockResolvedValue(true);
    mockOptimizeAsset.mockResolvedValue({
      hash: "abc123",
      raw: "/assets/optimized/abc123_v0.glb",
      optimized: { high: "", low: "", low_compressed: "" },
      propertyId: "optimized-ndraco",
    });

    await optimizeModel(
      { assetPath: "/assets/tree.glb", useWeld: true, useDraco: false, useMeshOpt: true },
      "/project",
    );

    expect(mockOptimizeAsset).toHaveBeenCalledWith(
      expect.objectContaining({ type: "model", url: "/assets/tree.glb" }),
      { useWeld: true, useDraco: false, useMeshOpt: true },
      { publicDir: expect.stringContaining("public") },
    );
  });

  it("returns error when optimization fails", async () => {
    mockFileExists.mockResolvedValue(true);
    mockOptimizeAsset.mockRejectedValue(new Error("Upload size limit exceeded (content-length)"));

    const result = await optimizeModel({ assetPath: "/assets/huge.glb" }, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("OPTIMIZE_FAILED");
    expect(data.message).toContain("Upload size limit exceeded");
  });
});

describe("optimize_vrm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing assetPath", async () => {
    const result = await optimizeVrm({}, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("MISSING_PARAM");
  });

  it("rejects unsupported file extension", async () => {
    const result = await optimizeVrm({ assetPath: "/assets/avatar.fbx" }, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("UNSUPPORTED_FORMAT");
  });

  it("rejects file not found", async () => {
    mockFileExists.mockResolvedValue(false);
    const result = await optimizeVrm({ assetPath: "/assets/missing.vrm" }, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("FILE_NOT_FOUND");
  });

  it("returns optimized VRM URL on success", async () => {
    mockFileExists.mockResolvedValue(true);
    const { readFile } = await import("node:fs/promises");
    vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-vrm-data"));
    mockOptimizeVRM.mockResolvedValue("/assets/optimized/avatar_optimized.vrm");

    const result = await optimizeVrm({ assetPath: "/assets/avatar.vrm" }, "/project");
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.optimizedUrl).toBe("/assets/optimized/avatar_optimized.vrm");
  });

  it("returns error when VRM optimization fails", async () => {
    mockFileExists.mockResolvedValue(true);
    const { readFile } = await import("node:fs/promises");
    vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-vrm-data"));
    mockOptimizeVRM.mockRejectedValue(new Error("Invalid VRM format"));

    const result = await optimizeVrm({ assetPath: "/assets/bad.vrm" }, "/project");
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe("OPTIMIZE_FAILED");
    expect(data.message).toContain("Invalid VRM format");
  });
});
