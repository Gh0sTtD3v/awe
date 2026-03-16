import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  copyFixture,
  extractLastJson,
  makeTempProjectDir,
  runCli,
  slideAnimFixture,
} from "./support/cli-test-helpers";

describe("bake-anim CLI", () => {
  it("bakes an fbx animation into json", () => {
    const projectDir = makeTempProjectDir();
    const relativeFbxPath = path.join("assets", "anims", "slide-anim.fbx");

    copyFixture(
      slideAnimFixture,
      path.join(projectDir, "public", relativeFbxPath),
    );

    const { stdout, exitCode } = runCli([
      "bake-anim",
      relativeFbxPath,
      `--project-dir=${projectDir}`,
    ]);

    expect(exitCode).toBe(0);

    const result = extractLastJson<{
      name: string;
      outputPath: string;
      hash: string;
      url: string;
      trackCount: number;
    }>(stdout);

    expect(result.name).toBe("slide-anim");
    expect(result.url).toBe("/assets/anims/slide-anim.json");
    expect(result.trackCount).toBeGreaterThan(0);
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(fs.existsSync(result.outputPath)).toBe(true);

    const bakedAnimation = JSON.parse(
      fs.readFileSync(result.outputPath, "utf-8"),
    ) as { name: string; tracks: Array<{ name: string }> };

    expect(bakedAnimation.name).toBe("slide-anim");
    expect(bakedAnimation.tracks.length).toBe(result.trackCount);
    expect(
      bakedAnimation.tracks.some((track) =>
        track.name.startsWith("mixamorig"),
      ),
    ).toBe(true);
  });
});
