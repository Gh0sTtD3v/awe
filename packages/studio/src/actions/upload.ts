"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { resolveWorkingFolder } from "../server/working-folder-service";
import { requirePermission } from "../server/access";

interface UploadResponse {
  url: string;
  mimeType: string;
}

export async function uploadFile(formData: FormData): Promise<UploadResponse> {
  await requirePermission("upload_assets");

  const file = formData.get("file") as File;
  const id = formData.get("id") as string;

  // `id` becomes a file name: never let it climb out of assets/.
  if (!id || path.basename(id) !== id || id.startsWith(".")) {
    throw new Error("Invalid upload id");
  }
  const mimeType = formData.get("mimeType") as string;

  const workingFolder = await resolveWorkingFolder();
  const assetsDir = path.join(workingFolder, "assets");
  await mkdir(assetsDir, { recursive: true });

  const filePath = path.join(assetsDir, id);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return {
    url: `/assets/${id}`,
    mimeType,
  };
}
