"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { resolveWorkingFolder } from "../server/working-folder-service";

interface UploadResponse {
  url: string;
  mimeType: string;
}

export async function uploadFile(formData: FormData): Promise<UploadResponse> {
  const file = formData.get("file") as File;
  const id = formData.get("id") as string;
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
