import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

const assetOptimizerDist = resolve(
  repoRoot,
  "packages/asset-optimizer/dist/index.js",
);
const mcpServerDist = resolve(repoRoot, "packages/mcp-server/dist/index.js");

const hasAssetOptimizerDist = existsSync(assetOptimizerDist);
const hasMcpServerDist = existsSync(mcpServerDist);

if (hasAssetOptimizerDist && hasMcpServerDist) {
  console.log(
    "[postinstall] MCP build artifacts already exist; skipping package builds.",
  );
  process.exit(0);
}

function runBuild(filter) {
  console.log(`[postinstall] Building ${filter}...`);
  const result = spawnSync("pnpm", ["--filter", filter, "build"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(
      `[postinstall] Build failed for ${filter} (exit code: ${result.status ?? "unknown"}).`,
    );
    process.exit(result.status ?? 1);
  }
}

if (!hasAssetOptimizerDist) {
  runBuild("@oncyberio/asset-optimizer");
}

if (!hasAssetOptimizerDist || !hasMcpServerDist) {
  runBuild("@oncyberio/mcp-server");
}

console.log("[postinstall] MCP build prerequisites are ready.");
