/**
 * Worker script for baking FBX animations to JSON.
 * Runs via tsx (not compiled by tsc) so it can import engine internals.
 *
 * Usage: npx tsx bin/bake-worker.ts <fbx-path> <output-path> <name>
 * Outputs JSON to stdout: { success, name, outputPath, hash, trackCount }
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { fbxToJSON } = require("@oncyberio/engine/space/components/vrmanims/fbxtojson/index.js");

function normalizeMixamoRigName(name: string): string {
  const match = /^mixamorig\d+([A-Z].*)$/.exec(name);
  if (match) {
    return `mixamorig${match[1]}`;
  }
  return name;
}

function normalizeTrackName(trackName: string): string {
  const splitIndex = trackName.indexOf(".");
  if (splitIndex === -1) {
    return normalizeMixamoRigName(trackName);
  }

  const rigName = trackName.slice(0, splitIndex);
  const propertyName = trackName.slice(splitIndex + 1);
  return `${normalizeMixamoRigName(rigName)}.${propertyName}`;
}

function normalizeBakeTrackNames(bake: { tracks?: Array<{ name?: unknown }> }): void {
  if (!Array.isArray(bake.tracks)) {
    return;
  }

  for (const track of bake.tracks) {
    if (typeof track.name === "string") {
      track.name = normalizeTrackName(track.name);
    }
  }
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

function computeHash(data: object): string {
  const { name, uuid, ...rest } = data as any;
  const str = stableStringify(rest);
  return crypto.createHash("sha256").update(str).digest("hex");
}

try {
  const [fbxPath, outputPath, name] = process.argv.slice(2);

  if (!fbxPath || !outputPath || !name) {
    console.log(JSON.stringify({ success: false, error: "Usage: bake-worker.ts <fbx-path> <output-path> <name>" }));
    process.exit(1);
  }

  if (!fs.existsSync(fbxPath)) {
    console.log(JSON.stringify({ success: false, error: `FBX file not found: ${fbxPath}` }));
    process.exit(1);
  }

  const buffer = fs.readFileSync(fbxPath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const bake = fbxToJSON(arrayBuffer);
  bake.name = name;
  normalizeBakeTrackNames(bake);

  if (!Array.isArray(bake.tracks) || bake.tracks.length === 0) {
    console.log(JSON.stringify({
      success: false,
      error:
        `Baked animation has 0 tracks for "${path.basename(fbxPath)}". ` +
        `This usually means the FBX rig names do not map to Mixamo bones ` +
        `(expected names like "mixamorigHips", but variants like "mixamorig7Hips" or other rigs may fail).`,
    }));
    process.exit(1);
  }

  const hash = computeHash(bake);

  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(bake, null, 2));

  console.log(JSON.stringify({
    success: true,
    name,
    outputPath,
    hash,
    trackCount: bake.tracks.length,
  }));
} catch (err: any) {
  console.log(JSON.stringify({ success: false, error: err.message }));
  process.exit(1);
}
