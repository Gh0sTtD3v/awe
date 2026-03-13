#!/usr/bin/env npx tsx --tsconfig scripts/tsconfig.json

/**
 * CLI script to collect assets from a Firestore game export and generate a local project.
 *
 * Usage:
 *   pnpm collect-assets -- --input=exports/games_Zf2yvoCPpF3nnyY1ZTK0.json --output=./examples/pep-collector
 *
 * Options:
 *   --input=PATH   Path to the Firestore export JSON (required)
 *   --output=PATH  Destination project directory (default: .)
 *   --help, -h     Show this help message
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import { URL } from "url";

interface ExportedDoc {
  _id: string;
  _path: string;
  _data: Record<string, any>;
  _subcollections: Record<string, ExportedDoc[]>;
}

interface ExportResult {
  collection: string;
  documentCount: number;
  subcollectionCount: number;
  exportedAt: string;
  documents: ExportedDoc[];
}

interface AssetEntry {
  url: string;
  fallbackUrl?: string;
  localDir: string;
  filename: string;
  localPath: string;
}

function parseArgs(): { inputPath: string; outputDir: string } {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Usage: pnpm collect-assets -- --input=<path> [--output=<path>]

Arguments:
  --input=PATH   Path to the Firestore export JSON (required)
  --output=PATH  Destination project directory (default: .)

Options:
  --help, -h     Show this help message

Examples:
  pnpm collect-assets -- --input=exports/games_Zf2yvoCPpF3nnyY1ZTK0.json --output=./examples/pep-collector
`);
    process.exit(0);
  }

  let inputPath: string | null = null;
  let outputDir = ".";

  for (const arg of args) {
    if (arg.startsWith("--input=")) {
      inputPath = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--output=")) {
      outputDir = arg.split("=").slice(1).join("=");
    }
  }

  if (!inputPath) {
    console.error("Error: --input=PATH is required");
    process.exit(1);
  }

  // Resolve relative paths from the monorepo root (parent of scripts/)
  const rootDir = path.resolve(__dirname, "..");
  return {
    inputPath: path.resolve(rootDir, inputPath),
    outputDir: path.resolve(rootDir, outputDir),
  };
}

function getFilenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Check for ?filename= parameter (IPFS URLs)
    const filenameParam = parsed.searchParams.get("filename");
    if (filenameParam) return filenameParam;
    // Fall back to last path segment
    const segments = parsed.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || "unknown";
  } catch {
    return "unknown";
  }
}

function getExtension(filename: string): string {
  const match = filename.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : "";
}

function resolveFilenameCollisions(assets: Map<string, AssetEntry>): void {
  const pathCounts = new Map<string, number>();
  for (const entry of assets.values()) {
    const fullPath = path.join(entry.localDir, entry.filename);
    const count = (pathCounts.get(fullPath) || 0) + 1;
    pathCounts.set(fullPath, count);
  }

  const pathCounters = new Map<string, number>();
  for (const entry of assets.values()) {
    const fullPath = path.join(entry.localDir, entry.filename);
    if ((pathCounts.get(fullPath) || 0) > 1) {
      const counter = (pathCounters.get(fullPath) || 0) + 1;
      pathCounters.set(fullPath, counter);
      const ext = path.extname(entry.filename);
      const base = path.basename(entry.filename, ext);
      entry.filename = `${base}_${counter}${ext}`;
    }
    entry.localPath = path.join(entry.localDir, entry.filename);
  }
}

function collectAssets(
  gameData: Record<string, any>,
  components: ExportedDoc[]
): Map<string, AssetEntry> {
  const assets = new Map<string, AssetEntry>();
  const links: Record<string, string> = gameData.$links || {};

  function addAsset(url: string, localDir: string, filename?: string): void {
    if (!url || typeof url !== "string") return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) return;
    if (assets.has(url)) return;

    const resolvedFilename = filename || getFilenameFromUrl(url);
    assets.set(url, {
      url,
      fallbackUrl: links[url],
      localDir,
      filename: resolvedFilename,
      localPath: path.join(localDir, resolvedFilename),
    });
  }

  // Cover image
  if (gameData.cover) {
    const ext = getExtension(getFilenameFromUrl(gameData.cover)) || "webp";
    addAsset(gameData.cover, "", `game-thumbnail.${ext}`);
  }

  // Kit models
  if (gameData.kits) {
    for (const [kitName, kit] of Object.entries<any>(gameData.kits)) {
      if (kit.paths) {
        for (const [quality, url] of Object.entries<any>(kit.paths)) {
          if (typeof url === "string" && url.startsWith("http")) {
            const ext = getExtension(getFilenameFromUrl(url)) || "glb";
            addAsset(url, "assets/optimized", `${kitName}_${quality}.${ext}`);
          }
        }
      }
    }
  }

  // Walk components
  for (const comp of components) {
    const data = comp._data;
    const type = data.type;

    // Audio components
    if (type === "audio" && data.url) {
      const name = data.name || getFilenameFromUrl(data.url);
      const ext = getExtension(name) || "mp3";
      const safeName = name
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_");
      addAsset(data.url, "assets/audio", `${safeName}.${ext}`);
    }

    // Batch children (avatars)
    if (type === "$$batch" && data.batchChildren) {
      for (const child of Object.values<any>(data.batchChildren)) {
        if (child.url) {
          addAsset(child.url, "assets/avatars", getFilenameFromUrl(child.url));
        }
      }
    }

    // Envmap component
    if (type === "envmap") {
      if (data.imageOpts?.image?.image) {
        addAsset(
          data.imageOpts.image.image,
          "assets/images",
          getFilenameFromUrl(data.imageOpts.image.image)
        );
      }
      if (data.imageOpts?.image?.path) {
        addAsset(
          data.imageOpts.image.path,
          "assets/envmaps",
          getFilenameFromUrl(data.imageOpts.image.path)
        );
      }
    }

    // Terrain component
    if (type === "terrain") {
      if (data.textureOpts?.image) {
        addAsset(
          data.textureOpts.image,
          "assets/images",
          getFilenameFromUrl(data.textureOpts.image)
        );
      }
      if (
        data.textureOpts?.path &&
        data.textureOpts.path !== data.textureOpts.image
      ) {
        addAsset(
          data.textureOpts.path,
          "assets/images",
          getFilenameFromUrl(data.textureOpts.path)
        );
      }
      if (data.textureSideOpts?.image) {
        addAsset(
          data.textureSideOpts.image,
          "assets/images",
          getFilenameFromUrl(data.textureSideOpts.image)
        );
      }
      if (
        data.textureSideOpts?.path &&
        data.textureSideOpts.path !== data.textureSideOpts.image
      ) {
        addAsset(
          data.textureSideOpts.path,
          "assets/images",
          getFilenameFromUrl(data.textureSideOpts.path)
        );
      }
    }

    // Background component
    if (type === "background") {
      const imgObj = data.textureOpts?.imageOpts?.image;
      if (imgObj?.path) {
        addAsset(
          imgObj.path,
          "assets/images",
          getFilenameFromUrl(imgObj.path)
        );
      }
      if (imgObj?.image && imgObj.image !== imgObj.path) {
        addAsset(
          imgObj.image,
          "assets/images",
          getFilenameFromUrl(imgObj.image)
        );
      }
    }
  }

  resolveFilenameCollisions(assets);
  return assets;
}

function downloadFile(
  url: string,
  destPath: string,
  maxRedirects = 5
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error("Too many redirects"));
    }

    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { timeout: 30000 }, (res) => {
      // Follow redirects
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        const redirectUrl = new URL(
          res.headers.location,
          url
        ).toString();
        res.resume();
        return downloadFile(redirectUrl, destPath, maxRedirects - 1).then(
          resolve,
          reject
        );
      }

      if (res.statusCode && res.statusCode >= 400) {
        res.resume();
        return reject(
          new Error(`HTTP ${res.statusCode} for ${url}`)
        );
      }

      const stream = fs.createWriteStream(destPath);
      res.pipe(stream);
      stream.on("finish", () => {
        stream.close();
        resolve();
      });
      stream.on("error", (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout downloading ${url}`));
    });
  });
}

async function downloadWithConcurrency(
  assets: Map<string, AssetEntry>,
  publicDir: string,
  concurrency = 5
): Promise<{ downloaded: number; skipped: number; failed: AssetEntry[] }> {
  const entries = Array.from(assets.values());
  const total = entries.length;
  let downloaded = 0;
  let skipped = 0;
  const failed: AssetEntry[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < entries.length) {
      const i = index++;
      const entry = entries[i];
      const destPath = path.join(publicDir, entry.localPath);
      const destDir = path.dirname(destPath);

      fs.mkdirSync(destDir, { recursive: true });

      // Skip if already exists with non-zero size
      if (fs.existsSync(destPath)) {
        const stat = fs.statSync(destPath);
        if (stat.size > 0) {
          skipped++;
          console.log(
            `[${i + 1}/${total}] - ${entry.filename} (exists, skipped)`
          );
          continue;
        }
      }

      try {
        await downloadFile(entry.url, destPath);
        downloaded++;
        console.log(`[${i + 1}/${total}] \u2713 ${entry.filename}`);
      } catch (err: any) {
        // Try fallback URL
        if (entry.fallbackUrl) {
          try {
            await downloadFile(entry.fallbackUrl, destPath);
            downloaded++;
            console.log(
              `[${i + 1}/${total}] \u2713 ${entry.filename} (fallback)`
            );
            continue;
          } catch {
            // fallback also failed
          }
        }
        failed.push(entry);
        console.log(
          `[${i + 1}/${total}] \u2717 ${entry.filename}: ${err.message}`
        );
      }
    }
  }

  const workers: Promise<void>[] = [];
  for (let w = 0; w < concurrency; w++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return { downloaded, skipped, failed };
}

function buildUrlMap(
  assets: Map<string, AssetEntry>
): Map<string, string> {
  const urlMap = new Map<string, string>();
  for (const [url, entry] of assets) {
    urlMap.set(url, `/${entry.localPath}`);
    // Also map the fallback URL to the same local path
    if (entry.fallbackUrl) {
      urlMap.set(entry.fallbackUrl, `/${entry.localPath}`);
    }
  }
  return urlMap;
}

function rewriteUrls(obj: any, urlMap: Map<string, string>): any {
  if (typeof obj === "string") {
    return urlMap.get(obj) ?? obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => rewriteUrls(item, urlMap));
  }
  if (obj !== null && typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip $links — no longer needed in local version
      if (key === "$links") continue;
      result[key] = rewriteUrls(value, urlMap);
    }
    return result;
  }
  return obj;
}

function buildStaticScene(
  gameDoc: ExportedDoc,
  urlMap: Map<string, string>
): Record<string, any> {
  const data = gameDoc._data;
  const componentDocs = gameDoc._subcollections.components || [];

  // Build components as a keyed object { componentId: componentData }
  const components: Record<string, any> = {};
  for (const comp of componentDocs) {
    components[comp._id] = comp._data;
  }

  // Build kits with rewritten URLs
  const kits = data.kits ? rewriteUrls(data.kits, urlMap) : {};

  // Build rewritten components
  const rewrittenComponents = rewriteUrls(components, urlMap);

  const scene: Record<string, any> = {
    creatorId: data.creatorId || "anon",
    editors: data.editors || [],
    id: gameDoc._id,
    kits,
    components: rewrittenComponents,
    params: data.params || {},
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };

  return scene;
}

async function main() {
  const { inputPath, outputDir } = parseArgs();

  // Validate input file
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  console.log(`Input:  ${inputPath}`);
  console.log(`Output: ${outputDir}`);
  console.log();

  // Read export JSON
  const raw = fs.readFileSync(inputPath, "utf-8");
  const exportData: ExportResult = JSON.parse(raw);

  if (!exportData.documents || exportData.documents.length === 0) {
    console.error("Error: No documents found in export");
    process.exit(1);
  }

  const gameDoc = exportData.documents[0];
  const components = gameDoc._subcollections.components || [];

  console.log(`Game: ${gameDoc._data.headline || gameDoc._id}`);
  console.log(`Components: ${components.length}`);
  console.log();

  // Collect assets
  const assets = collectAssets(gameDoc._data, components);
  console.log(`Assets found: ${assets.size}`);
  console.log();

  // Create output directories
  const publicDir = path.join(outputDir, "public");
  const dirs = [
    path.join(publicDir, "data"),
    path.join(publicDir, "assets/optimized"),
    path.join(publicDir, "assets/audio"),
    path.join(publicDir, "assets/avatars"),
    path.join(publicDir, "assets/images"),
    path.join(publicDir, "assets/envmaps"),
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Download assets
  console.log("Downloading assets...");
  console.log();
  const { downloaded, skipped, failed } = await downloadWithConcurrency(
    assets,
    publicDir
  );

  console.log();

  // Build URL map and static scene
  const urlMap = buildUrlMap(assets);
  const scene = buildStaticScene(gameDoc, urlMap);

  // Write static-scene.json
  const scenePath = path.join(publicDir, "data", "static-scene.json");
  fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));
  console.log(`Wrote: ${scenePath}`);

  // Write empty registry files
  const uploadedAssetsPath = path.join(
    publicDir,
    "data",
    "uploaded_assets.json"
  );
  const uploadedAvatarsPath = path.join(
    publicDir,
    "data",
    "uploaded_avatars.json"
  );
  fs.writeFileSync(uploadedAssetsPath, "[]");
  fs.writeFileSync(uploadedAvatarsPath, "[]");
  console.log(`Wrote: ${uploadedAssetsPath}`);
  console.log(`Wrote: ${uploadedAvatarsPath}`);

  // Summary
  console.log();
  console.log("--- Summary ---");
  console.log(`  Total assets: ${assets.size}`);
  console.log(`  Downloaded:   ${downloaded}`);
  console.log(`  Skipped:      ${skipped}`);
  console.log(`  Failed:       ${failed.length}`);

  if (failed.length > 0) {
    console.log();
    console.log("Failed downloads:");
    for (const entry of failed) {
      console.log(`  - ${entry.filename}: ${entry.url}`);
    }
  }

  console.log();
  console.log("Done!");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
