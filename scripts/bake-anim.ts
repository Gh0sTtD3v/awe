#!/usr/bin/env npx tsx --tsconfig scripts/tsconfig.json

/**
 * CLI script to bake FBX animations for VRM avatars
 *
 * Usage:
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/bake-anim.ts <fbx-path> [name] [options]
 *
 * Examples:
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/bake-anim.ts ./assets/anims/zombie_attack.fbx
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/bake-anim.ts ./assets/anims/dance.fbx "hip_hop_dance" --loop --timeScale=1.5
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/bake-anim.ts public/assets/anims/dance.fbx --project-dir=/path/to/game --json
 *
 * Options:
 *   --loop              Animation should loop (default: true)
 *   --no-loop           Animation should not loop
 *   --sync              Animation should be synchronized
 *   --timeScale=N       Playback speed multiplier (default: 1)
 *   --project-dir=PATH  Project root directory (default: monorepo root)
 *   --output=PATH       Output directory (default: {project-dir}/public/assets/anims/)
 *   --json              Output structured JSON to stdout (suppresses other output)
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// Import the FBX to JSON converter
import { fbxToJSON } from "engine/space/components/vrmanims/fbxtojson";

interface AnimOptions {
  loop: boolean;
  sync: boolean;
  timeScale: number;
}

let isJsonMode = false;

function log(...args: unknown[]) {
  if (!isJsonMode) {
    console.log(...args);
  }
}

function parseArgs(): {
  fbxPath: string;
  name: string;
  options: AnimOptions;
  projectDir: string;
  outputDir: string | null;
  jsonOutput: boolean;
} {
  // Filter out '--' separator that pnpm passes through
  const args = process.argv.slice(2).filter((arg) => arg !== "--");

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Usage: npx tsx --tsconfig scripts/tsconfig.json scripts/bake-anim.ts <fbx-path> [name] [options]

Arguments:
  fbx-path    Path to the FBX file (required)
  name        Animation name (optional, defaults to filename without extension)

Options:
  --loop              Animation should loop (default: true)
  --no-loop           Animation should not loop
  --sync              Animation should be synchronized (default: false)
  --timeScale=N       Playback speed multiplier (default: 1)
  --project-dir=PATH  Project root directory (default: monorepo root)
  --output=PATH       Output directory (default: {project-dir}/public/assets/anims/)
  --json              Output structured JSON to stdout (suppresses other output)
  --help, -h          Show this help message

Examples:
  npx tsx --tsconfig scripts/tsconfig.json scripts/bake-anim.ts ./zombie_attack.fbx
  npx tsx --tsconfig scripts/tsconfig.json scripts/bake-anim.ts ./dance.fbx "hip_hop" --loop --timeScale=1.2
  npx tsx --tsconfig scripts/tsconfig.json scripts/bake-anim.ts public/assets/anims/dance.fbx --project-dir=. --json
`);
    process.exit(0);
  }

  const fbxPath = args[0];

  // Find name (first non-option arg after fbxPath)
  let name: string | undefined;
  let projectDir = path.resolve(__dirname, "..");
  let outputDir: string | null = null;
  let jsonOutput = false;
  const options: AnimOptions = {
    loop: true,
    sync: false,
    timeScale: 1,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      if (arg === "--loop") {
        options.loop = true;
      } else if (arg === "--no-loop") {
        options.loop = false;
      } else if (arg === "--sync") {
        options.sync = true;
      } else if (arg.startsWith("--timeScale=")) {
        options.timeScale = parseFloat(arg.split("=")[1]) || 1;
      } else if (arg.startsWith("--project-dir=")) {
        projectDir = path.resolve(arg.split("=").slice(1).join("="));
      } else if (arg === "--project-dir") {
        i++;
        if (i < args.length) {
          projectDir = path.resolve(args[i]);
        }
      } else if (arg.startsWith("--output=")) {
        outputDir = path.resolve(arg.split("=").slice(1).join("="));
      } else if (arg === "--output") {
        i++;
        if (i < args.length) {
          outputDir = path.resolve(args[i]);
        }
      } else if (arg === "--json") {
        jsonOutput = true;
      }
    } else if (!name) {
      name = arg;
    }
  }

  // Default name from filename
  if (!name) {
    name = path
      .basename(fbxPath, ".fbx")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .toLowerCase();
  }

  return { fbxPath, name, options, projectDir, outputDir, jsonOutput };
}

function stableStringify(obj: any): string {
  if (typeof obj !== "object" || obj === null) {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(stableStringify).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
      .join(",") +
    "}"
  );
}

async function computeHash(data: object): Promise<string> {
  // Remove name and uuid for hashing (like the editor does)
  const { name, uuid, ...rest } = data as any;
  const str = stableStringify(rest);
  const hashBuffer = crypto.createHash("sha256").update(str).digest();
  return hashBuffer.toString("hex");
}

async function main() {
  const {
    fbxPath,
    name,
    options,
    projectDir,
    outputDir: outputDirArg,
    jsonOutput,
  } = parseArgs();
  isJsonMode = jsonOutput;

  // Resolve paths
  const resolvedFbxPath = path.resolve(projectDir, fbxPath);
  const outputDir =
    outputDirArg ?? path.join(projectDir, "public", "assets", "anims");
  const outputPath = path.join(outputDir, `${name}.json`);

  // Check FBX file exists
  if (!fs.existsSync(resolvedFbxPath)) {
    if (jsonOutput) {
      console.log(
        JSON.stringify({
          success: false,
          error: `FBX file not found: ${resolvedFbxPath}`,
        })
      );
      process.exit(1);
    }
    console.error(`Error: FBX file not found: ${resolvedFbxPath}`);
    process.exit(1);
  }

  log(`Baking animation: ${path.basename(fbxPath)} -> ${name}`);

  // Read FBX file
  const buffer = fs.readFileSync(resolvedFbxPath);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );

  // Convert FBX to JSON bake
  log("Converting FBX to VRM animation format...");
  const bake = fbxToJSON(arrayBuffer);
  bake.name = name;

  if (!Array.isArray(bake.tracks) || bake.tracks.length === 0) {
    const errorMessage =
      `Baked animation has 0 tracks for "${path.basename(fbxPath)}". ` +
      `This usually means the FBX rig names do not map to Mixamo bones ` +
      `(expected names like "mixamorigHips", but variants like "mixamorig7Hips" or other rigs may fail).`;

    if (jsonOutput) {
      console.log(
        JSON.stringify({
          success: false,
          error: errorMessage,
        })
      );
      process.exit(1);
    }

    console.error(`Error: ${errorMessage}`);
    process.exit(1);
  }

  // Compute hash
  const hash = await computeHash(bake);
  log(`Hash: ${hash}`);

  // Write baked JSON
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(bake, null, 2));
  log(`Wrote: ${outputPath}`);

  if (jsonOutput) {
    // Structured JSON output for programmatic consumption
    console.log(
      JSON.stringify({
        success: true,
        name,
        outputPath,
        url: `/assets/anims/${name}.json`,
        hash,
        loop: options.loop,
        sync: options.sync,
        timeScale: options.timeScale,
      })
    );
    return;
  }

  // Generate StaticGameData snippet
  const animKey = `custom-${Date.now()}`;
  const snippet = {
    [animKey]: {
      fileName: path.basename(fbxPath),
      name: name,
      loop: options.loop,
      sync: options.sync,
      timeScale: options.timeScale,
      url: `/assets/anims/${name}.json`,
      hash: hash,
    },
  };

  log("\n--- Add to StaticGameData.components['vrm-anims'].anims ---\n");
  log(JSON.stringify(snippet, null, 2));

  log("\n--- Or use this simpler key ---\n");
  const simpleSnippet = {
    [name]: {
      fileName: path.basename(fbxPath),
      name: name,
      loop: options.loop,
      sync: options.sync,
      timeScale: options.timeScale,
      url: `/assets/anims/${name}.json`,
      hash: hash,
    },
  };
  log(JSON.stringify(simpleSnippet, null, 2));

  log("\nDone!");
}

main().catch((err) => {
  if (isJsonMode) {
    console.log(JSON.stringify({ success: false, error: err.message }));
    process.exit(1);
  }
  console.error("Error:", err.message);
  process.exit(1);
});
