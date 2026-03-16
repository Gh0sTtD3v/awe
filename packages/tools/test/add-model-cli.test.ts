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

describe("add-model CLI", () => {
  it("adds a model, optimizes it, and updates the uploaded-assets manifest", () => {
    const projectDir = makeTempProjectDir();
    const relativeSourcePath = path.join("models", "soccer-field.glb");

    copyFixture(
      soccerFieldFixture,
      path.join(projectDir, relativeSourcePath),
    );

    const { stdout, exitCode } = runCli([
      "add-model",
      relativeSourcePath,
      `--project-dir=${projectDir}`,
    ]);

    expect(exitCode).toBe(0);

    const result = extractLastJson<{
      url: string;
      optimized: {
        high: string;
        low: string;
        low_compressed: string;
      };
      name: string;
      mimeType: string;
    }>(stdout);

    expect(result.name).toBe("soccer-field.glb");
    expect(result.mimeType).toBe("model/gltf-binary");
    expect(fs.existsSync(publicPathFromUrl(projectDir, result.url))).toBe(true);
    expect(
      fs.existsSync(publicPathFromUrl(projectDir, result.optimized.high)),
    ).toBe(true);

    const uploadedAssetsPath = path.join(
      projectDir,
      "public",
      "data",
      "uploaded_assets.json",
    );
    const uploadedAssets = JSON.parse(
      fs.readFileSync(uploadedAssetsPath, "utf-8"),
    ) as Array<{
      url: string;
      d_optimized_files?: {
        high: string;
        low: string;
        low_compressed: string;
      };
    }>;

    expect(uploadedAssets).toHaveLength(1);
    expect(uploadedAssets[0]?.url).toBe(result.url);
    expect(uploadedAssets[0]?.d_optimized_files).toEqual(result.optimized);
  });

  it("honors the --name override", () => {
    const projectDir = makeTempProjectDir();
    const relativeSourcePath = path.join("models", "soccer-field.glb");

    copyFixture(
      soccerFieldFixture,
      path.join(projectDir, relativeSourcePath),
    );

    const { stdout, exitCode } = runCli([
      "add-model",
      relativeSourcePath,
      "--name=Practice Field",
      `--project-dir=${projectDir}`,
    ]);

    expect(exitCode).toBe(0);

    const result = extractLastJson<{
      url: string;
      name: string;
    }>(stdout);

    expect(result.name).toBe("Practice Field");

    const uploadedAssetsPath = path.join(
      projectDir,
      "public",
      "data",
      "uploaded_assets.json",
    );
    const uploadedAssets = JSON.parse(
      fs.readFileSync(uploadedAssetsPath, "utf-8"),
    ) as Array<{ url: string; name: string }>;

    expect(uploadedAssets[0]?.url).toBe(result.url);
    expect(uploadedAssets[0]?.name).toBe("Practice Field");
  });
});
