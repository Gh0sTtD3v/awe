"use server";

import { OptimizeService, type OptimizeAssetResult, type OOAsset } from "@oncyberio/tools";
import { resolveWorkingFolder } from "../server/working-folder-service";

/**
 * Server action to optimize a 3D asset
 * @param asset - The asset to optimize
 * @param compressionOptions - Compression settings
 * @returns Optimization result with URLs to optimized variants
 */
export async function optimizeAssetAction(
  asset: OOAsset,
  compressionOptions?: {
    useWeld?: boolean;
    useDraco?: boolean;
    useMeshOpt?: boolean;
  }
): Promise<OptimizeAssetResult> {
  const finalCompressionOptions = {
    useWeld: true,
    useDraco: true,
    useMeshOpt: true,
    ...compressionOptions,
  };

  const publicDir = await resolveWorkingFolder();

  return OptimizeService.optimizeAsset(asset, finalCompressionOptions, {
    publicDir,
  });
}

/**
 * Server action to optimize a VRM avatar
 * @param formData - Form data containing the VRM file
 * @returns URL to the optimized VRM file
 */
export async function optimizeVRMAction(formData: FormData): Promise<string> {
  const file = formData.get("vrm") as File;
  const id = formData.get("id") as string;

  if (!file) {
    throw new Error("No VRM file provided");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = id || file.name;

  const publicDir = await resolveWorkingFolder();

  return OptimizeService.optimizeVRM(buffer, filename, publicDir);
}

/**
 * Check if an asset is already optimized
 */
export async function isAssetOptimized(
  asset: OOAsset,
  compressionOptions?: {
    useWeld?: boolean;
    useDraco?: boolean;
    useMeshOpt?: boolean;
  }
): Promise<boolean> {
  const finalCompressionOptions = {
    useWeld: true,
    useDraco: true,
    useMeshOpt: true,
    ...compressionOptions,
  };

  return OptimizeService.is3DAssetOptimized(asset, finalCompressionOptions);
}
