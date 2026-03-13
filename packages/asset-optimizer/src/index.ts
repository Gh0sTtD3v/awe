// Types
export type { OptimizedFiles, OOAsset } from "./types";

// GLTF Optimization
export { optimizeGLTF } from "./gltf";
export type { CompressionOptions, OptimizedVariant } from "./gltf";

// VRM Processing
export { processVRMBuffer } from "./vrm";
export {
  VRMExtension,
  VRMC_Extension,
  VRMC_materials_mtoon,
  VRMC_springBone,
  VRMC_node_constraint,
} from "./vrm";

// Texture Processing
// toktx disabled due to cpu-features native module build issue on macOS ARM64
export { textureCompress, textureResize } from "./texture";
export { TextureResizeFilter, Mode, Filter } from "./texture";

// MIME Utilities
export {
  extToMime,
  mimetoExt,
  supportedMimes,
  isUploadable,
  withCover,
} from "./utils";

// Optimize Service
export { OptimizeService } from "./optimize-service";
export type { OptimizeAssetResult } from "./optimize-service";
