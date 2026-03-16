import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  copyFixture,
  extractLastJson,
  makeTempProjectDir,
  publicPathFromUrl,
  runCli,
  soccerFieldFixture,
} from "./support/cli-test-helpers";

describe("upload-asset CLI", () => {
  it("uploads an asset and deduplicates repeated uploads", () => {
    const projectDir = makeTempProjectDir();
    const sourcePath = path.join("models", "soccer-field.glb");

    copyFixture(soccerFieldFixture, path.join(projectDir, sourcePath));

    const firstRun = runCli([
      "upload-asset",
      sourcePath,
      `--project-dir=${projectDir}`,
    ]);
    const secondRun = runCli([
      "upload-asset",
      sourcePath,
      `--project-dir=${projectDir}`,
    ]);

    expect(firstRun.exitCode).toBe(0);
    expect(secondRun.exitCode).toBe(0);

    const firstResult = extractLastJson<{
      hash: string;
      url: string;
      name: string;
      mimeType: string;
    }>(firstRun.stdout);
    const secondResult = extractLastJson<typeof firstResult>(secondRun.stdout);

    expect(secondResult).toEqual(firstResult);
    expect(firstResult.name).toBe("soccer-field.glb");
    expect(firstResult.mimeType).toBe("model/gltf-binary");
    expect(fs.existsSync(publicPathFromUrl(projectDir, firstResult.url))).toBe(
      true,
    );

    const uploadedAssetsPath = path.join(
      projectDir,
      "public",
      "data",
      "uploaded_assets.json",
    );
    const uploadedAssets = JSON.parse(
      fs.readFileSync(uploadedAssetsPath, "utf-8"),
    ) as Array<{ hash: string }>;

    expect(uploadedAssets).toHaveLength(1);
    expect(uploadedAssets[0]?.hash).toBe(firstResult.hash);
  });

  it("honors the --name override", () => {
    const projectDir = makeTempProjectDir();
    const sourcePath = path.join("models", "soccer-field.glb");

    copyFixture(soccerFieldFixture, path.join(projectDir, sourcePath));

    const { stdout, exitCode } = runCli([
      "upload-asset",
      sourcePath,
      "--name=Custom Field",
      `--project-dir=${projectDir}`,
    ]);

    expect(exitCode).toBe(0);

    const result = extractLastJson<{
      url: string;
      name: string;
    }>(stdout);

    expect(result.name).toBe("Custom Field");

    const uploadedAssetsPath = path.join(
      projectDir,
      "public",
      "data",
      "uploaded_assets.json",
    );
    const uploadedAssets = JSON.parse(
      fs.readFileSync(uploadedAssetsPath, "utf-8"),
    ) as Array<{ name: string; url: string }>;

    expect(uploadedAssets[0]?.name).toBe("Custom Field");
    expect(uploadedAssets[0]?.url).toBe(result.url);
  });
});
