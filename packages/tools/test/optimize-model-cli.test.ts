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

describe("optimize-model CLI", () => {
  it("optimizes a model from the public directory", () => {
    const projectDir = makeTempProjectDir();

    copyFixture(
      soccerFieldFixture,
      path.join(projectDir, "public", "soccer-field.glb"),
    );

    const { stdout, exitCode } = runCli([
      "optimize-model",
      "/soccer-field.glb",
      `--project-dir=${projectDir}`,
    ]);

    expect(exitCode).toBe(0);

    const result = extractLastJson<{
      raw: string;
      optimized: {
        high: string;
        low: string;
        low_compressed: string;
      };
      propertyId: string;
    }>(stdout);

    expect(result.propertyId).toBe("optimized");
    expect(fs.existsSync(publicPathFromUrl(projectDir, result.raw))).toBe(true);
    expect(
      fs.existsSync(publicPathFromUrl(projectDir, result.optimized.high)),
    ).toBe(true);
    expect(
      fs.existsSync(publicPathFromUrl(projectDir, result.optimized.low)),
    ).toBe(true);
    expect(
      fs.existsSync(
        publicPathFromUrl(projectDir, result.optimized.low_compressed),
      ),
    ).toBe(true);
  });

  it("honors the compression flags", () => {
    const projectDir = makeTempProjectDir();

    copyFixture(
      soccerFieldFixture,
      path.join(projectDir, "public", "soccer-field.glb"),
    );

    const { stdout, exitCode } = runCli([
      "optimize-model",
      "/soccer-field.glb",
      "--no-draco",
      "--no-meshopt",
      "--no-weld",
      `--project-dir=${projectDir}`,
    ]);

    expect(exitCode).toBe(0);

    const result = extractLastJson<{
      raw: string;
      optimized: {
        high: string;
        low: string;
        low_compressed: string;
      };
      propertyId: string;
    }>(stdout);

    expect(result.propertyId).toBe("optimized-nweld_ndraco_nmeshopt");
    expect(result.raw).toContain("_nweld_ndraco_nmeshopt");
    expect(result.optimized.high).toContain("_nweld_ndraco_nmeshopt");
    expect(result.optimized.low).toContain("_nweld_ndraco_nmeshopt");
    expect(result.optimized.low_compressed).toContain("_nweld_ndraco_nmeshopt");
  });
});
