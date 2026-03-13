#!/usr/bin/env npx tsx --tsconfig scripts/tsconfig.json

/**
 * CLI script to inspect GLTF/GLB files and output metadata
 *
 * Usage:
 *   pnpm inspect-gltf path/to/model.glb              # Human-readable output
 *   pnpm inspect-gltf path/to/model.gltf --json      # JSON output for AI consumption
 *   pnpm inspect-gltf --help                         # Help text
 *
 * Information extracted:
 *   - File info: path, size, GLTF version, generator
 *   - Extensions: used and required extensions
 *   - Animations: name, duration, track count
 *   - Meshes: name, type, vertex count, face count, material
 *   - Materials: name, type, key properties
 *   - Skeleton: bone count, bone names (for rigged models)
 */

import * as fs from "fs";
import * as path from "path";
import type {
  AnimationClip,
  Object3D,
  Mesh,
  SkinnedMesh,
  Bone,
  Material,
  BufferGeometry,
} from "three";

// Types for the GLTF result
interface GLTFResult {
  scene: Object3D;
  scenes: Object3D[];
  animations: AnimationClip[];
  parser: {
    json: GLTFJson;
  };
}

interface GLTFJson {
  asset?: {
    version?: string;
    generator?: string;
    copyright?: string;
  };
  extensionsUsed?: string[];
  extensionsRequired?: string[];
  animations?: Array<{ name?: string }>;
  meshes?: Array<{ name?: string }>;
  materials?: Array<{ name?: string }>;
  nodes?: Array<{ name?: string }>;
  images?: Array<{ name?: string; uri?: string }>;
}

// Output types
interface FileInfo {
  path: string;
  size: number;
  sizeFormatted: string;
}

interface AssetInfo {
  version: string;
  generator: string;
  copyright?: string;
}

interface AnimationInfo {
  name: string;
  duration: number;
  trackCount: number;
}

interface MeshInfo {
  name: string;
  type: "Mesh" | "SkinnedMesh";
  vertices: number;
  faces: number;
  material: string;
}

interface MaterialInfo {
  name: string;
  type: string;
  color?: string;
  roughness?: number;
  metalness?: number;
}

interface SkeletonInfo {
  boneCount: number;
  bones: string[];
}

interface ExtensionsInfo {
  used: string[];
  required: string[];
}

interface InspectionResult {
  file: FileInfo;
  asset: AssetInfo;
  extensions: ExtensionsInfo;
  animations: AnimationInfo[];
  meshes: MeshInfo[];
  materials: MaterialInfo[];
  skeleton: SkeletonInfo | null;
}

function parseArgs(): { filePath: string; jsonOutput: boolean } | null {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Usage: pnpm inspect-gltf <path> [options]

Arguments:
  path          Path to the GLTF/GLB file (required)

Options:
  --json        Output as JSON (for AI/script consumption)
  --help, -h    Show this help message

Examples:
  pnpm inspect-gltf assets/gltf/Xbot.glb
  pnpm inspect-gltf assets/gltf/Xbot.glb --json
  pnpm inspect-gltf assets/gltf/Xbot.glb --json | jq .animations
`);
    return null;
  }

  const filePath = args[0];
  const jsonOutput = args.includes("--json");

  return { filePath, jsonOutput };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  return `${seconds.toFixed(2)}s`;
}

function colorToHex(color: { r: number; g: number; b: number }): string {
  const r = Math.round(color.r * 255)
    .toString(16)
    .padStart(2, "0");
  const g = Math.round(color.g * 255)
    .toString(16)
    .padStart(2, "0");
  const b = Math.round(color.b * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${r}${g}${b}`;
}

async function loadGLTF(filePath: string): Promise<GLTFResult> {
  // Dynamic imports
  const { GLTFLoader } = await import(
    "engine/internal/resources/loaders/gltf-loader"
  );
  const { NodeDracoLoader } = await import(
    "engine/internal/resources/loaders/node-draco-loader"
  );

  const loader = new GLTFLoader();
  const dracoLoader = new NodeDracoLoader();
  loader.setDRACOLoader(dracoLoader);

  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );

  return loader.parseAsync(arrayBuffer, "") as Promise<GLTFResult>;
}

function extractAnimations(gltf: GLTFResult): AnimationInfo[] {
  return gltf.animations.map((clip) => ({
    name: clip.name || "(unnamed)",
    duration: clip.duration,
    trackCount: clip.tracks.length,
  }));
}

function extractMeshes(scene: Object3D): MeshInfo[] {
  const meshes: MeshInfo[] = [];

  scene.traverse((obj) => {
    const mesh = obj as Mesh | SkinnedMesh;
    if (mesh.isMesh || mesh.isSkinnedMesh) {
      const geometry = mesh.geometry as BufferGeometry;
      const positionAttr = geometry.attributes.position;
      const vertices = positionAttr ? positionAttr.count : 0;
      const index = geometry.index;
      const faces = index ? index.count / 3 : vertices / 3;

      let materialName = "(none)";
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          materialName = mesh.material.map((m) => m.name || "(unnamed)").join(", ");
        } else {
          materialName = (mesh.material as Material).name || "(unnamed)";
        }
      }

      meshes.push({
        name: mesh.name || "(unnamed)",
        type: (mesh as SkinnedMesh).isSkinnedMesh ? "SkinnedMesh" : "Mesh",
        vertices,
        faces: Math.floor(faces),
        material: materialName,
      });
    }
  });

  return meshes;
}

function extractMaterials(scene: Object3D): MaterialInfo[] {
  const materialsMap = new Map<string, MaterialInfo>();

  scene.traverse((obj) => {
    const mesh = obj as Mesh;
    if (mesh.isMesh && mesh.material) {
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      for (const mat of materials) {
        const material = mat as Material & {
          color?: { r: number; g: number; b: number };
          roughness?: number;
          metalness?: number;
        };

        if (!materialsMap.has(material.uuid)) {
          const info: MaterialInfo = {
            name: material.name || "(unnamed)",
            type: material.type,
          };

          if (material.color) {
            info.color = colorToHex(material.color);
          }
          if (typeof material.roughness === "number") {
            info.roughness = material.roughness;
          }
          if (typeof material.metalness === "number") {
            info.metalness = material.metalness;
          }

          materialsMap.set(material.uuid, info);
        }
      }
    }
  });

  return Array.from(materialsMap.values());
}

function extractSkeleton(scene: Object3D): SkeletonInfo | null {
  const bones: string[] = [];

  scene.traverse((obj) => {
    const bone = obj as Bone;
    if (bone.isBone) {
      bones.push(bone.name || "(unnamed)");
    }
  });

  if (bones.length === 0) return null;

  return {
    boneCount: bones.length,
    bones,
  };
}

function printHumanReadable(result: InspectionResult): void {
  const { file, asset, extensions, animations, meshes, materials, skeleton } =
    result;

  // Header
  console.log(`\nGLTF: ${path.basename(file.path)} (${file.sizeFormatted})`);
  console.log(
    `Version: ${asset.version} | Generator: ${asset.generator || "(unknown)"}`
  );
  if (asset.copyright) {
    console.log(`Copyright: ${asset.copyright}`);
  }

  // Extensions
  if (extensions.used.length > 0) {
    console.log(`\nEXTENSIONS`);
    console.log(`  Used: ${extensions.used.join(", ")}`);
    if (extensions.required.length > 0) {
      console.log(`  Required: ${extensions.required.join(", ")}`);
    }
  }

  // Animations
  console.log(`\nANIMATIONS (${animations.length})`);
  if (animations.length === 0) {
    console.log("  (none)");
  } else {
    for (const anim of animations) {
      const name = anim.name.padEnd(20);
      const duration = formatDuration(anim.duration).padStart(8);
      console.log(`  ${name} ${duration}   ${anim.trackCount} tracks`);
    }
  }

  // Meshes
  console.log(`\nMESHES (${meshes.length})`);
  if (meshes.length === 0) {
    console.log("  (none)");
  } else {
    for (const mesh of meshes) {
      const name = mesh.name.padEnd(20);
      const type = mesh.type.padEnd(12);
      const verts = `${mesh.vertices.toLocaleString()} verts`.padStart(14);
      console.log(`  ${name} ${type} ${verts}   ${mesh.material}`);
    }
  }

  // Materials
  console.log(`\nMATERIALS (${materials.length})`);
  if (materials.length === 0) {
    console.log("  (none)");
  } else {
    for (const mat of materials) {
      const name = mat.name.padEnd(20);
      let props = mat.type;
      if (mat.color) props += ` color:${mat.color}`;
      if (mat.roughness !== undefined)
        props += ` rough:${mat.roughness.toFixed(2)}`;
      if (mat.metalness !== undefined)
        props += ` metal:${mat.metalness.toFixed(2)}`;
      console.log(`  ${name} ${props}`);
    }
  }

  // Skeleton
  if (skeleton) {
    console.log(`\nSKELETON (${skeleton.boneCount} bones)`);
    // Show first 10 bones, then ellipsis if more
    const displayBones = skeleton.bones.slice(0, 10);
    const remaining = skeleton.boneCount - displayBones.length;
    console.log(`  ${displayBones.join(", ")}${remaining > 0 ? `, ... (+${remaining} more)` : ""}`);
  }

  console.log("");
}

async function main() {
  const parsed = parseArgs();
  if (!parsed) {
    process.exit(0);
  }

  const { filePath, jsonOutput } = parsed;

  // Resolve paths
  const projectRoot = path.resolve(__dirname, "..");
  const resolvedPath = path.resolve(projectRoot, filePath);

  // Check file exists
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }

  // Check extension
  const ext = path.extname(resolvedPath).toLowerCase();
  if (ext !== ".gltf" && ext !== ".glb") {
    console.error(`Error: File must be .gltf or .glb (got ${ext})`);
    process.exit(1);
  }

  // Get file stats
  const stats = fs.statSync(resolvedPath);

  // Load GLTF
  const gltf = await loadGLTF(resolvedPath);

  // Extract info
  const result: InspectionResult = {
    file: {
      path: filePath,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
    },
    asset: {
      version: gltf.parser.json.asset?.version || "2.0",
      generator: gltf.parser.json.asset?.generator || "",
      copyright: gltf.parser.json.asset?.copyright,
    },
    extensions: {
      used: gltf.parser.json.extensionsUsed || [],
      required: gltf.parser.json.extensionsRequired || [],
    },
    animations: extractAnimations(gltf),
    meshes: extractMeshes(gltf.scene),
    materials: extractMaterials(gltf.scene),
    skeleton: extractSkeleton(gltf.scene),
  };

  // Output
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHumanReadable(result);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
