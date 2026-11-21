import { NodeIO } from "@gltf-transform/core";
// import { toktx } from "../texture/toktx"; // Disabled: cpu-features native module build issue on macOS ARM64
import {
  KHRONOS_EXTENSIONS,
  EXTTextureWebP,
  EXTMeshGPUInstancing,
} from "@gltf-transform/extensions";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import type { Primitive } from "@gltf-transform/core";
import {
  prune,
  dedup,
  simplifyPrimitive,
  metalRough,
  draco,
  weld,
  instance,
  dequantize,
  join,
  palette,
} from "@gltf-transform/functions";
import textureCompress from "../texture/texture-compress";
import { textureResize } from "../texture/texture-resize";
import draco3d from "draco3dgltf";

/** Largest shape change the simplifier may make, in metres (1 mm). */
const SIMPLIFY_MAX_ERROR_METERS = 0.001;
/** Cap on the simplifier's error, as a fraction of the mesh radius (the previous fixed value). */
const SIMPLIFY_MAX_ERROR_RELATIVE = 0.001;
/** Draco position precision, in bits per axis. */
const DRACO_POSITION_BITS = 16;

/**
 * The simplifier's error limit for a primitive: meshoptimizer measures error
 * as a fraction of the mesh radius, so convert the absolute limit with the
 * primitive's own size. Big merged primitives get a tiny fraction (keeping
 * their small details), small ones keep the old relative limit. 0 = skip.
 */
export function simplifyErrorFor(prim: Primitive): number {
  const position = prim.getAttribute("POSITION");
  if (!position || position.getCount() === 0) return 0;
  const min = position.getMinNormalized([]);
  const max = position.getMaxNormalized([]);
  const radius = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2;
  if (!(radius > 0)) return 0;
  return Math.min(SIMPLIFY_MAX_ERROR_RELATIVE, SIMPLIFY_MAX_ERROR_METERS / radius);
}

/**
 * Compression options for GLTF optimization
 */
export interface CompressionOptions {
  /** Apply vertex welding to remove duplicate vertices (default: true) */
  useWeld?: boolean;
  /** Apply Draco mesh compression (default: true) */
  useDraco?: boolean;
  /** Apply MeshOptimizer simplification (default: true) */
  useMeshOpt?: boolean;
}

/**
 * Result of GLTF optimization containing buffer and filename
 */
export interface OptimizedVariant {
  /** Optimized buffer */
  buffer: Uint8Array;
  /** Output filename */
  name: string;
}

/**
 * Optimizes a GLTF/GLB file with multiple quality variants.
 * 
 * Applies the following transformations:
 * - Material optimization (metallic-roughness workflow)
 * - Palette optimization for textures
 * - Mesh deduplication and pruning
 * - Vertex welding (optional)
 * - MeshOptimizer simplification (optional)
 * - Draco mesh compression (optional)
 * - Texture compression with quality variants
 * 
 * @param data - The raw GLTF/GLB buffer
 * @param ids - Output filenames for each variant (high, low, lowCompressed)
 * @param compressionOptions - Compression settings
 * @returns Object containing buffers and filenames for each quality variant
 * 
 * @example
 * ```typescript
 * const result = await optimizeGLTF(buffer, {
 *   high: 'model_high.glb',
 *   low: 'model_low.glb',
 *   lowCompressed: 'model_low_ktx.glb'
 * });
 * 
 * // Access variants
 * const highQuality = result.high.buffer;
 * const lowQuality = result.low.buffer;
 * const compressed = result.lowCompressed.buffer;
 * ```
 */
export async function optimizeGLTF(
  data: ArrayBuffer,
  ids: { high: string; low: string; lowCompressed: string },
  compressionOptions: CompressionOptions = {
    useWeld: true,
    useDraco: true,
    useMeshOpt: true,
  }
): Promise<{
  high: OptimizedVariant;
  low: OptimizedVariant;
  lowCompressed: OptimizedVariant;
}> {
  const io = new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS)
    .registerExtensions([EXTTextureWebP, EXTMeshGPUInstancing]);

  io.registerDependencies({
    "draco3d.decoder": await draco3d.createDecoderModule(),
    "draco3d.encoder": await draco3d.createEncoderModule(),
  });

  const uint8 = new Uint8Array(data);
  const originalDocument = await io.readBinary(uint8);

  await originalDocument.transform(
    metalRough(),
    palette({ min: 5 }),
    dequantize(),
    join(),
    instance(),
    prune(),
    dedup()
  );

  // Tolerances below are absolute (in metres), not fractions of the mesh size:
  // join() above merges every primitive sharing a material, so one "mesh" can
  // span a whole level (e.g. all the sign text in a 100 m area). A relative
  // tolerance on that would be centimetres and destroys small detail such as
  // lettering.

  if (compressionOptions.useWeld === true) {
    // Lossless: merge only identical vertices.
    await originalDocument.transform(weld({ tolerance: 0 }));
  }

  if (compressionOptions.useMeshOpt === true) {
    await MeshoptSimplifier.ready;
    for (const mesh of originalDocument.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        const error = simplifyErrorFor(prim);
        if (error > 0) {
          simplifyPrimitive(originalDocument, prim, {
            simplifier: MeshoptSimplifier,
            ratio: 0.0,
            error,
            lockBorder: true,
          });
        }
      }
    }
    await originalDocument.transform(prune());
  }

  // Draco is applied to each variant just before writing it: Document.clone()
  // does not keep Draco's encoder options, so a clone would silently fall
  // back to the default 14-bit positions. Positions are rounded to a grid over
  // each primitive's bounds; 16 bits keeps that grid at ~1.5 mm even on a
  // 100 m merged primitive (14 bits would be ~6 mm, visible on lettering).
  const write = async (doc: typeof originalDocument) => {
    if (compressionOptions.useDraco === true) {
      await doc.transform(draco({ quantizePosition: DRACO_POSITION_BITS }));
    }
    return io.writeBinary(doc);
  };

  const highDocument = originalDocument.clone();

  // high buffer
  await highDocument.transform(
    textureCompress({
      encoder: sharp,
      quality: 90,
      resize: [2048, 2048],
      slots: /^(?!normalTexture).*$/,
    })
  );

  const highBuffer = await write(highDocument);

  const resultHigh = {
    buffer: highBuffer,
    name: ids.high,
  };

  // low buffer
  const lowDocument = highDocument.clone();

  await lowDocument.transform(
    textureCompress({
      encoder: sharp,
      quality: 80,
      resize: [1024, 1024],
      slots: /^(?!normalTexture).*$/,
    })
  );

  const lowBuffer = await write(lowDocument);

  const resultlow = {
    buffer: lowBuffer,
    name: ids.low,
  };

  // low compressed
  // TODO: Re-enable KTX2 compression once cpu-features native module issue is resolved
  const lowCompressedDocument = lowDocument.clone();

  await lowCompressedDocument.transform(
    textureResize({ size: [1024, 1024], square: true } as any)
    // toktx disabled due to cpu-features native module build issue on macOS ARM64
    // toktx({
    //   mode: "etc1s",
    //   powerOfTwo: true,
    // })
  );

  const lowCompressedBuffer = await write(lowCompressedDocument);

  const resultlowCompressed = {
    buffer: lowCompressedBuffer,
    name: ids.lowCompressed,
  };

  return {
    high: resultHigh,
    low: resultlow,
    lowCompressed: resultlowCompressed,
  };
}
