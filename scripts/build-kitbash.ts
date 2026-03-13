import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

const EXPORT_PATH = resolve(
  ROOT,
  "exports/games_Zf2yvoCPpF3nnyY1ZTK0.json",
);
const LIBRARY_PATH = resolve(
  ROOT,
  "examples/pep-collector/public/library3D.json",
);
const SCENE_PATH = resolve(
  ROOT,
  "examples/pep-collector/public/data/static-scene.json",
);

// PepeKit nodeNames from library3D (underscores in export become spaces in library)
const PEPEKIT_NODE_NAMES = new Set([
  "roseau",
  "border straight",
  "border angle",
  "lilypod 01",
  "lilypod 02",
  "pick up speed",
  "pick up fast",
  "pick up radius",
  "danger zone",
  "pick up slow",
  "radius player",
]);

function kitTypeToNodeName(kitType: string): string {
  return kitType.replace(/_/g, " ");
}

interface ExportComponent {
  _id: string;
  _data: {
    id: string;
    type: string;
    kitType?: string;
    kit?: string;
    name?: string;
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
    collider?: Record<string, unknown>;
    script?: Record<string, unknown>;
    _version?: number;
  };
}

interface Library3DEntry {
  name: string;
  source?: { nodeName: string; name: string };
  url?: { pinata: string };
  d_optimized_files?: {
    high?: { pinata: string };
    low?: { pinata: string };
    low_compressed?: { pinata: string };
  };
}

function main() {
  // 1. Read the Firestore export
  const exportData = JSON.parse(readFileSync(EXPORT_PATH, "utf-8"));
  const components: ExportComponent[] =
    exportData.documents[0]._subcollections.components;

  // 2. Read library3D and build a lookup map: nodeName → library entry (PepeKit only)
  const library3D = JSON.parse(
    readFileSync(LIBRARY_PATH, "utf-8"),
  ) as Library3DEntry[];

  const pepeKitByNodeName = new Map<string, Library3DEntry>();
  for (const item of library3D) {
    if (item.source?.name === "PepeKit") {
      pepeKitByNodeName.set(item.source.nodeName, item);
    }
  }

  console.log(
    `Found ${pepeKitByNodeName.size} PepeKit nodes in library3D:`,
    [...pepeKitByNodeName.keys()].sort(),
  );

  // 3. Read the current static-scene.json
  const scene = JSON.parse(readFileSync(SCENE_PATH, "utf-8"));

  // Remove existing kitbash entries so we can re-add them as model type
  let removedCount = 0;
  for (const [key, comp] of Object.entries(scene.components)) {
    if ((comp as Record<string, unknown>).type === "kitbash") {
      delete scene.components[key];
      removedCount++;
    }
  }
  if (removedCount > 0) {
    console.log(`Removed ${removedCount} existing kitbash entries`);
  }

  const existingKeys = new Set(Object.keys(scene.components));
  console.log(`Existing components in scene: ${existingKeys.size}`);

  // 4. Extract kitbash components and filter for PepeKit
  const kitbashComponents = components.filter(
    (c) => c._data.type === "kitbash",
  );
  console.log(`Total kitbash components in export: ${kitbashComponents.length}`);

  const countByType: Record<string, number> = {};
  let added = 0;
  let skipped = 0;
  let missingLibrary = 0;

  for (const comp of kitbashComponents) {
    const data = comp._data;
    const kitType = data.kitType;
    if (!kitType) {
      console.warn(`  Skipping component ${data.id}: no kitType`);
      skipped++;
      continue;
    }

    const nodeName = kitTypeToNodeName(kitType);

    // Filter: only PepeKit items
    if (!PEPEKIT_NODE_NAMES.has(nodeName)) {
      console.log(
        `  Skipping non-PepeKit kitType: "${kitType}" (id: ${data.id})`,
      );
      skipped++;
      continue;
    }

    // Look up library3D entry for URLs
    const libEntry = pepeKitByNodeName.get(nodeName);
    if (!libEntry) {
      console.warn(
        `  No library3D entry for nodeName "${nodeName}" (id: ${data.id})`,
      );
      missingLibrary++;
      skipped++;
      continue;
    }

    const highUrl = libEntry.d_optimized_files?.high?.pinata;
    if (!highUrl) {
      console.warn(
        `  No high URL for nodeName "${nodeName}" (id: ${data.id})`,
      );
      missingLibrary++;
      skipped++;
      continue;
    }

    // Skip if already exists in scene (as a non-kitbash entry)
    if (existingKeys.has(data.id)) {
      console.log(`  Already exists in scene: ${data.id}`);
      skipped++;
      continue;
    }

    // Build the scene entry as a model component
    const entry: Record<string, unknown> = {
      id: data.id,
      type: "model",
      name: libEntry.name,
      kit: "cyber",
      url: highUrl,
      optimized: {
        high: libEntry.d_optimized_files?.high?.pinata,
        low: libEntry.d_optimized_files?.low?.pinata,
        low_compressed: libEntry.d_optimized_files?.low_compressed?.pinata,
      },
      position: data.position || { x: 0, y: 0, z: 0 },
      rotation: data.rotation || { x: 0, y: 0, z: 0 },
      scale: data.scale || { x: 1, y: 1, z: 1 },
    };

    if (data.collider) {
      entry.collider = data.collider;
    }

    if (data.script) {
      entry.script = data.script;
    }

    if (data._version) {
      entry._version = data._version;
    }

    scene.components[data.id] = entry;
    countByType[kitType] = (countByType[kitType] || 0) + 1;
    added++;
  }

  // 5. Write back
  writeFileSync(SCENE_PATH, JSON.stringify(scene, null, 2) + "\n");

  // 6. Print summary
  console.log(`\n--- Summary ---`);
  console.log(`Added: ${added}`);
  console.log(`Skipped: ${skipped}`);
  if (missingLibrary > 0) {
    console.log(`Missing library entries: ${missingLibrary}`);
  }
  console.log(`\nBy kitType:`);
  for (const [type, count] of Object.entries(countByType).sort()) {
    console.log(`  ${type}: ${count}`);
  }
  console.log(
    `\nTotal components in scene now: ${Object.keys(scene.components).length}`,
  );
}

main();
