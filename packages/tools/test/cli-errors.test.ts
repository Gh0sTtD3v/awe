import { describe, expect, it } from "vitest";
import { extractLastJson, runCli } from "./support/cli-test-helpers";

describe("CLI errors and help", () => {
  it("shows help and exits successfully", () => {
    const { stdout, exitCode } = runCli(["--help"]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("add-model");
    expect(stdout).toContain("optimize-vrm");
  });

  it("reports an unknown command", () => {
    const { stdout, exitCode } = runCli(["wat"]);

    expect(exitCode).toBe(1);
    expect(extractLastJson(stdout)).toEqual({
      error: true,
      message: "Unknown command: wat",
    });
  });

  it("reports a missing required argument", () => {
    const { stdout, exitCode } = runCli(["upload-asset"]);

    expect(exitCode).toBe(1);
    expect(extractLastJson(stdout)).toEqual({
      error: true,
      message: "Missing required argument: <source-path>",
    });
  });

  it("reports file-not-found errors for optimize-model", () => {
    const { stdout, exitCode } = runCli([
      "optimize-model",
      "/missing.glb",
      "--project-dir=/tmp/non-existent-tools-project",
    ]);

    expect(exitCode).toBe(1);
    expect(extractLastJson(stdout)).toEqual({
      error: true,
      message: "File not found: /missing.glb",
    });
  });
});
