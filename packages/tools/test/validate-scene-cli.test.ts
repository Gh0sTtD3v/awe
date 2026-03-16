import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  copyFixture,
  extractLastJson,
  makeTempProjectDir,
  runCli,
  soccerFieldFixture,
  writeJson,
} from "./support/cli-test-helpers";

describe("validate-scene CLI", () => {
  it("validates a well-formed scene", () => {
    const projectDir = makeTempProjectDir();

    copyFixture(
      soccerFieldFixture,
      path.join(projectDir, "public", "assets", "soccer-field.glb"),
    );
    writeJson(path.join(projectDir, "public", "data", "static-scene.json"), {
      items: [
        {
          id: "spawn-1",
          name: "Spawn",
          type: "spawn",
        },
        {
          id: "model-1",
          name: "Field",
          type: "model",
          data: {
            url: "/assets/soccer-field.glb",
          },
        },
      ],
    });

    const { stdout, exitCode } = runCli([
      "validate-scene",
      `--project-dir=${projectDir}`,
    ]);

    expect(exitCode).toBe(0);
    expect(extractLastJson(stdout)).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
  });

  it("reports scene validation errors and warnings", () => {
    const projectDir = makeTempProjectDir();

    writeJson(path.join(projectDir, "public", "data", "static-scene.json"), {
      items: [
        {
          id: "model-1",
          name: "Broken field",
          type: "model",
          parentId: "missing-parent",
          data: {
            url: "/assets/missing.glb",
          },
        },
      ],
    });

    const { stdout, exitCode } = runCli([
      "validate-scene",
      `--project-dir=${projectDir}`,
    ]);

    expect(exitCode).toBe(1);

    const result = extractLastJson<{
      valid: boolean;
      errors: string[];
      warnings: string[];
    }>(stdout);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "Component 'Broken field' (model-1) references non-existent parent 'missing-parent'",
      ]),
    );
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        "Component 'Broken field' (model-1) references missing local file: /assets/missing.glb",
        "No spawn point component found in scene",
      ]),
    );
  });
});
