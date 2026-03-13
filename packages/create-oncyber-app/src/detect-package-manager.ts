import type { PackageManager } from "./index";

export function detectPackageManager(): PackageManager {
  const agent = process.env.npm_config_user_agent;
  if (!agent) return "npm";

  const name = agent.split("/")[0];
  if (name === "pnpm") return "pnpm";
  if (name === "yarn") return "yarn";
  return "npm";
}
