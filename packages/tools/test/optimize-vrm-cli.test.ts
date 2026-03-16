import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  copyFixture,
  extractLastJson,
  makeTempProjectDir,
  pepeVrmFixture,
  publicPathFromUrl,
  runCli,
} from "./support/cli-test-helpers";

describe("optimize-vrm CLI", () => {
  it("optimizes a vrm-compatible glb from the public directory", () => {
    const projectDir = makeTempProjectDir();

    copyFixture(
      pepeVrmFixture,
      path.join(projectDir, "public", "pepe-vrm.glb"),
    );

    const { stdout, exitCode } = runCli([
      "optimize-vrm",
      "/pepe-vrm.glb",
      `--project-dir=${projectDir}`,
    ]);

    expect(exitCode).toBe(0);

    const result = extractLastJson<{
      optimizedUrl: string;
    }>(stdout);

    expect(result.optimizedUrl).toBe("/assets/optimized/pepe-vrm_compressed.glb");
    expect(
      fs.existsSync(publicPathFromUrl(projectDir, result.optimizedUrl)),
    ).toBe(true);
  });
});
