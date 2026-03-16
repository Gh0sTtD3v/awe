import { describe, expect, it } from "vitest";
import {
  extractLastJson,
  runCli,
  soccerFieldFixture,
} from "./support/cli-test-helpers";

describe("inspect-gltf CLI", () => {
  it("inspects a glb fixture", () => {
    const { stdout, exitCode } = runCli([
      "inspect-gltf",
      soccerFieldFixture,
    ]);

    expect(exitCode).toBe(0);

    const result = extractLastJson<{
      file: { path: string; size: number };
      meshes: Array<{ name: string }>;
      materials: Array<{ name: string }>;
      skeleton: unknown;
    }>(stdout);

    expect(result.file.path).toBe(soccerFieldFixture);
    expect(result.file.size).toBeGreaterThan(0);
    expect(result.meshes.length).toBeGreaterThan(0);
    expect(result.meshes.some((mesh) => mesh.name === "Soccer_Field_0")).toBe(
      true,
    );
    expect(result.materials.some((material) => material.name === "Green")).toBe(
      true,
    );
    expect(result.skeleton).toBeNull();
  });
});
