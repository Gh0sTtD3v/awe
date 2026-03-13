import { describe, it, expect, afterEach } from "vitest";
import { detectPackageManager } from "../detect-package-manager";

describe("detectPackageManager", () => {
  const originalAgent = process.env.npm_config_user_agent;

  afterEach(() => {
    if (originalAgent === undefined) {
      delete process.env.npm_config_user_agent;
    } else {
      process.env.npm_config_user_agent = originalAgent;
    }
  });

  it("detects pnpm from user agent", () => {
    process.env.npm_config_user_agent =
      "pnpm/9.0.0 npm/? node/v20.0.0 darwin arm64";
    expect(detectPackageManager()).toBe("pnpm");
  });

  it("detects yarn from user agent", () => {
    process.env.npm_config_user_agent = "yarn/1.22.0 npm/? node/v20.0.0";
    expect(detectPackageManager()).toBe("yarn");
  });

  it("detects npm from user agent", () => {
    process.env.npm_config_user_agent =
      "npm/10.0.0 node/v20.0.0 darwin arm64";
    expect(detectPackageManager()).toBe("npm");
  });

  it("falls back to npm when no user agent is set", () => {
    delete process.env.npm_config_user_agent;
    expect(detectPackageManager()).toBe("npm");
  });

  it("falls back to npm for unknown agent", () => {
    process.env.npm_config_user_agent = "bun/1.0.0";
    expect(detectPackageManager()).toBe("npm");
  });
});
