import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { fileExists } from "../utils/file-io.js";
import { resolveProjectPath } from "../utils/paths.js";
import { makeError, makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

const execFileAsync = promisify(execFile);

export async function bakeAnimation(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const fbxPath = args.fbxPath as string;
  if (!fbxPath) return makeError("MISSING_PARAM", "fbxPath is required");

  // Validate FBX file exists in the project's public/ directory
  const relativePath = fbxPath.replace(/^\/+/, "");
  const resolvedFbx = resolveProjectPath(projectDir, "public", relativePath);
  if (!(await fileExists(resolvedFbx))) {
    return makeError("FILE_NOT_FOUND", `FBX file not found: ${fbxPath}`, "Path should be relative to public/ (e.g., assets/anims/zombie_attack.fbx)");
  }

  // Resolve the worker script within this package: dist/tools/ -> package root -> bin/
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const workerPath = resolve(packageRoot, "bin", "bake-worker.ts");
  if (!(await fileExists(workerPath))) {
    return makeError("SCRIPT_NOT_FOUND", "bake-worker.ts not found", `Expected: ${workerPath}`);
  }

  // Determine output path and animation name (always sanitize to snake_case)
  const rawName = args.name ? String(args.name) : relativePath
    .replace(/^.*\//, "")
    .replace(/\.fbx$/i, "");
  const name = rawName
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .toLowerCase();

  const outputDir = resolveProjectPath(projectDir, "public", "assets", "anims");
  const outputPath = resolve(outputDir, `${name}.json`);

  try {
    const tsxBin = resolve(packageRoot, "node_modules", ".bin", "tsx");
    const workerTsconfig = resolve(packageRoot, "bin", "tsconfig.json");
    const { stdout, stderr } = await execFileAsync(
      tsxBin, ["--tsconfig", workerTsconfig, workerPath, resolvedFbx, outputPath, name],
      { cwd: resolve(projectDir), timeout: 60_000 },
    );

    const trimmed = stdout.trim();
    if (!trimmed) {
      return makeError("BAKE_FAILED", "No output from bake worker", stderr ? stderr.trim() : undefined);
    }

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(trimmed);
    } catch {
      return makeError("BAKE_FAILED", "Failed to parse bake worker output", trimmed.slice(0, 200));
    }

    if (result.success === false) {
      return makeError("BAKE_FAILED", String(result.error || "Unknown bake error"));
    }

    const trackCount = typeof result.trackCount === "number" ? result.trackCount : undefined;
    if (trackCount === 0) {
      return makeError(
        "BAKE_FAILED",
        `Baked animation has 0 tracks for ${fbxPath}`,
        "Ensure this is a Mixamo FBX with standard rig names (e.g. mixamorigHips).",
      );
    }

    // Enrich result with animation metadata from tool args
    return makeSuccess({
      ...result,
      url: `/assets/anims/${name}.json`,
      loop: args.loop !== false,
      sync: args.sync === true,
      timeScale: args.timeScale ?? 1,
      trackCount,
    });
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message?: string };

    if (error.stdout) {
      try {
        const result = JSON.parse(error.stdout.trim());
        if (result.success === false) {
          return makeError("BAKE_FAILED", String(result.error || "Unknown bake error"));
        }
      } catch {
        // fall through
      }
    }

    const message = error.stderr?.trim() || error.message || String(err);
    return makeError("BAKE_FAILED", `Animation bake failed: ${message}`);
  }
}
