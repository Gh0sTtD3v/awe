import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseArgs } from "../index";

// Mock process.exit to prevent test runner from exiting
beforeEach(() => {
  vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("parseArgs", () => {
  it("returns defaults when no arguments provided", () => {
    const result = parseArgs(["node", "create-oncyber-app"]);
    expect(result).toEqual({
      projectName: undefined,
      template: undefined,
      packageManager: undefined,
      skipInstall: false,
      skipGit: false,
      local: false,
    });
  });

  it("parses positional project name", () => {
    const result = parseArgs(["node", "create-oncyber-app", "my-game"]);
    expect(result.projectName).toBe("my-game");
  });

  it("parses --use-npm flag", () => {
    const result = parseArgs(["node", "create-oncyber-app", "--use-npm"]);
    expect(result.packageManager).toBe("npm");
  });

  it("parses --use-pnpm flag", () => {
    const result = parseArgs(["node", "create-oncyber-app", "--use-pnpm"]);
    expect(result.packageManager).toBe("pnpm");
  });

  it("parses --use-yarn flag", () => {
    const result = parseArgs(["node", "create-oncyber-app", "--use-yarn"]);
    expect(result.packageManager).toBe("yarn");
  });

  it("parses --skip-install flag", () => {
    const result = parseArgs(["node", "create-oncyber-app", "--skip-install"]);
    expect(result.skipInstall).toBe(true);
  });

  it("parses --skip-git flag", () => {
    const result = parseArgs(["node", "create-oncyber-app", "--skip-git"]);
    expect(result.skipGit).toBe(true);
  });

  it("parses --template flag", () => {
    const result = parseArgs([
      "node",
      "create-oncyber-app",
      "--template",
      "multiplayer",
    ]);
    expect(result.template).toBe("multiplayer");
  });

  it("parses all flags together with project name", () => {
    const result = parseArgs([
      "node",
      "create-oncyber-app",
      "my-game",
      "--template",
      "starter",
      "--use-pnpm",
      "--skip-install",
      "--skip-git",
    ]);
    expect(result).toEqual({
      projectName: "my-game",
      template: "starter",
      packageManager: "pnpm",
      skipInstall: true,
      skipGit: true,
      local: false,
    });
  });

  it("ignores unknown flags", () => {
    const result = parseArgs([
      "node",
      "create-oncyber-app",
      "--unknown-flag",
    ]);
    expect(result.projectName).toBeUndefined();
    expect(result.skipInstall).toBe(false);
  });

  it("only takes the first positional argument as project name", () => {
    const result = parseArgs([
      "node",
      "create-oncyber-app",
      "first-name",
      "second-name",
    ]);
    expect(result.projectName).toBe("first-name");
  });

  it("handles --help flag", () => {
    parseArgs(["node", "create-oncyber-app", "--help"]);
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it("handles --version flag", () => {
    parseArgs(["node", "create-oncyber-app", "--version"]);
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it("handles flags before project name", () => {
    const result = parseArgs([
      "node",
      "create-oncyber-app",
      "--skip-git",
      "my-game",
      "--use-npm",
    ]);
    expect(result.projectName).toBe("my-game");
    expect(result.skipGit).toBe(true);
    expect(result.packageManager).toBe("npm");
  });

  it("parses --local flag", () => {
    const result = parseArgs(["node", "create-oncyber-app", "--local"]);
    expect(result.local).toBe(true);
  });

  it("defaults local to false", () => {
    const result = parseArgs(["node", "create-oncyber-app"]);
    expect(result.local).toBe(false);
  });
});
