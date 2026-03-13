import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

const CLI_PATH = path.resolve(__dirname, "../index.ts");
// Use the local monorepo root for testing instead of cloning from GitHub
const MONOREPO_ROOT = path.resolve(__dirname, "../../../..");

function runCli(
  args: string,
  cwd: string,
  env?: Record<string, string>,
): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`npx tsx ${CLI_PATH} ${args}`, {
      cwd,
      stdio: "pipe",
      env: {
        ...process.env,
        NO_COLOR: "1",
        AWE_REPO_URL: MONOREPO_ROOT,
        AWE_REPO_BRANCH: "dev-3",
        ...env,
      },
      timeout: 120000,
    }).toString();
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: (err.stdout?.toString() ?? "") + (err.stderr?.toString() ?? ""),
      exitCode: err.status ?? 1,
    };
  }
}

describe("CLI integration", { timeout: 30000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-oncyber-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates a project with --skip-install --skip-git", () => {
    const { stdout, exitCode } = runCli(
      "test-project --template starter --use-pnpm --skip-install --skip-git",
      tmpDir,
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Success!");
    expect(stdout).toContain("test-project");

    const projectDir = path.join(tmpDir, "test-project");
    expect(fs.existsSync(projectDir)).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "pnpm-workspace.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "apps/game/package.json"))).toBe(true);
  });

  it("sets project name in apps/game/package.json and root package.json", () => {
    runCli("my-cool-game --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const gamePkgPath = path.join(tmpDir, "my-cool-game", "apps/game/package.json");
    const gamePkg = JSON.parse(fs.readFileSync(gamePkgPath, "utf-8"));
    expect(gamePkg.name).toBe("my-cool-game");

    const rootPkgPath = path.join(tmpDir, "my-cool-game", "package.json");
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));
    expect(rootPkg.name).toBe("my-cool-game");
  });

  it("converts project name to kebab-case", () => {
    runCli("MyCoolGame --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const projectDir = path.join(tmpDir, "my-cool-game");
    expect(fs.existsSync(projectDir)).toBe(true);

    const gamePkg = JSON.parse(
      fs.readFileSync(path.join(projectDir, "apps/game/package.json"), "utf-8"),
    );
    expect(gamePkg.name).toBe("my-cool-game");
  });

  it("removes unwanted directories from clone", () => {
    runCli("cleanup-test --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const projectDir = path.join(tmpDir, "cleanup-test");
    expect(fs.existsSync(path.join(projectDir, "examples"))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, "docs"))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, "packages/create-oncyber-app"))).toBe(false);
  });

  it("removes template scripts from root package.json", () => {
    runCli("scripts-test --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const rootPkg = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "scripts-test", "package.json"), "utf-8"),
    );
    expect(rootPkg.scripts["template:dev"]).toBeUndefined();
    expect(rootPkg.scripts["template:check"]).toBeUndefined();
    expect(rootPkg.scripts["create-game"]).toBeUndefined();
    // Should keep other scripts
    expect(rootPkg.scripts["dev"]).toBeDefined();
  });

  it("removes examples/* from pnpm-workspace.yaml and keeps apps/*", () => {
    runCli("workspace-test --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const workspacePath = path.join(tmpDir, "workspace-test", "pnpm-workspace.yaml");
    const content = fs.readFileSync(workspacePath, "utf-8");
    expect(content).not.toContain("examples");
    expect(content).toContain("packages");
    expect(content).toContain("apps");
  });

  it("fails when directory already exists", () => {
    fs.mkdirSync(path.join(tmpDir, "existing-dir"));
    const { exitCode, stdout } = runCli(
      "existing-dir --template starter --use-pnpm --skip-install --skip-git",
      tmpDir,
    );

    expect(exitCode).not.toBe(0);
    expect(stdout).toContain("already exists");
  });

  it("fails with unknown template", () => {
    const { exitCode, stdout } = runCli(
      "bad-template --template nonexistent --use-pnpm --skip-install --skip-git",
      tmpDir,
    );

    expect(exitCode).not.toBe(0);
    expect(stdout).toContain("Unknown template");
    expect(stdout).toContain("nonexistent");
  });

  it("initializes git repo when --skip-git is not passed", () => {
    runCli("git-test --template starter --use-pnpm --skip-install", tmpDir);

    const projectDir = path.join(tmpDir, "git-test");
    expect(fs.existsSync(path.join(projectDir, ".git"))).toBe(true);

    // Check that initial commit was made
    const log = execSync("git log --oneline", {
      cwd: projectDir,
      stdio: "pipe",
    }).toString();
    expect(log).toContain("Initial commit from create-oncyber-app");
  });

  it("skips git init when --skip-git is passed", () => {
    runCli("no-git-test --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const projectDir = path.join(tmpDir, "no-git-test");
    expect(fs.existsSync(path.join(projectDir, ".git"))).toBe(false);
  });

  it("shows install command in next steps when --skip-install is passed", () => {
    const { stdout } = runCli(
      "skip-install-test --template starter --use-pnpm --skip-install --skip-git",
      tmpDir,
    );

    expect(stdout).toContain("pnpm install");
    expect(stdout).toContain("pnpm dev");
  });

  it("shows --help output", () => {
    const { stdout, exitCode } = runCli("--help", tmpDir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("--template");
    expect(stdout).toContain("--use-npm");
    expect(stdout).toContain("--use-pnpm");
    expect(stdout).toContain("--use-yarn");
    expect(stdout).toContain("--skip-install");
    expect(stdout).toContain("--skip-git");
    expect(stdout).toContain("update");
    expect(stdout).toContain("Templates:");
    expect(stdout).toContain("starter");
    expect(stdout).toContain("multiplayer");
  });

  it("shows --version output", () => {
    const { stdout, exitCode } = runCli("--version", tmpDir);

    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("includes packages/ directory in scaffolded project", () => {
    runCli("packages-test --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const projectDir = path.join(tmpDir, "packages-test");
    expect(fs.existsSync(path.join(projectDir, "packages/engine"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "packages/studio"))).toBe(true);
  });

  it("keeps workspace:* dependencies in apps/game (monorepo)", () => {
    runCli("workspace-deps --template starter --use-pnpm --skip-install --skip-git", tmpDir);

    const gamePkg = JSON.parse(
      fs.readFileSync(
        path.join(tmpDir, "workspace-deps", "apps/game/package.json"),
        "utf-8",
      ),
    );
    const engineDep = gamePkg.dependencies?.["@oncyberio/engine"];
    expect(engineDep).toBe("workspace:*");
  });

  it("scaffolds with multiplayer template", () => {
    const { stdout, exitCode } = runCli(
      "mp-test --template multiplayer --use-pnpm --skip-install --skip-git",
      tmpDir,
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Success!");

    const projectDir = path.join(tmpDir, "mp-test");
    expect(fs.existsSync(path.join(projectDir, "apps/game/package.json"))).toBe(true);

    // Multiplayer template should have server/ and shared/ dirs
    expect(fs.existsSync(path.join(projectDir, "apps/game/server"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "apps/game/shared"))).toBe(true);

    // Should have colyseus dependency
    const gamePkg = JSON.parse(
      fs.readFileSync(path.join(projectDir, "apps/game/package.json"), "utf-8"),
    );
    expect(gamePkg.name).toBe("mp-test");
    expect(gamePkg.dependencies?.["colyseus"]).toBeDefined();
  });
});

describe.skipIf(!process.env.TEST_REAL_CLONE)(
  "real clone from GitHub",
  { timeout: 120000 },
  () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-oncyber-real-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("scaffolds a project from the real GitHub repo", () => {
      const start = performance.now();

      const { stdout, exitCode } = runCli(
        "real-clone-test --template starter --use-pnpm --skip-install --skip-git",
        tmpDir,
        { AWE_REPO_URL: "", AWE_REPO_BRANCH: "dev-3" }, // clear override to use real URL
      );

      const elapsed = ((performance.now() - start) / 1000).toFixed(1);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Success!");

      const projectDir = path.join(tmpDir, "real-clone-test");

      // Monorepo structure present
      expect(fs.existsSync(path.join(projectDir, "package.json"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "pnpm-workspace.yaml"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "apps/game/package.json"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "packages/engine"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "packages/studio"))).toBe(true);

      // Unwanted dirs not present (sparse checkout)
      expect(fs.existsSync(path.join(projectDir, "examples"))).toBe(false);
      expect(fs.existsSync(path.join(projectDir, "docs"))).toBe(false);
      expect(fs.existsSync(path.join(projectDir, "packages/create-oncyber-app"))).toBe(false);

      // No .git (cleaned up)
      expect(fs.existsSync(path.join(projectDir, ".git"))).toBe(false);

      // Project name applied
      const gamePkg = JSON.parse(
        fs.readFileSync(path.join(projectDir, "apps/game/package.json"), "utf-8"),
      );
      expect(gamePkg.name).toBe("real-clone-test");

      console.log(`\n  Real GitHub clone completed in ${elapsed}s\n`);
    });
  },
);
