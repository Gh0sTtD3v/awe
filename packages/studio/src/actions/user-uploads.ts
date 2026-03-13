"use server";

import {
  UserUploadsService,
  type SetUploadOpts,
  type CheckResult,
} from "../server/user-uploads-service";
import { UserAssetUpload } from "../types/user-upload";
import { OptimizedFiles } from "../types/optimized-files";

export async function getUploadedAssets(): Promise<UserAssetUpload[]> {
  return UserUploadsService.getUploadedAssets();
}

export async function getAssetByHash(
  hash: string
): Promise<UserAssetUpload | null> {
  return UserUploadsService.getAssetByHash(hash);
}

export async function setUploadedAsset(
  opts: SetUploadOpts
): Promise<{ success: boolean }> {
  return UserUploadsService.setUploadedAsset(opts);
}

export async function checkUploadedAsset(
  hash: string
): Promise<CheckResult | null> {
  return UserUploadsService.checkUploadedAsset(hash);
}

export async function updateUpload(
  hash: string,
  data: Partial<Omit<UserAssetUpload, "hash">>
): Promise<boolean> {
  return UserUploadsService.updateUpload(hash, data);
}

export async function deleteUploads(hashes: string[]): Promise<void> {
  return UserUploadsService.deleteUploads(hashes);
}

export async function setOptimizedFiles(
  hash: string,
  files: OptimizedFiles
): Promise<boolean> {
  return UserUploadsService.setOptimizedFiles(hash, files);
}
