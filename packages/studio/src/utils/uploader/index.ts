import { uploadFile as uploadFileAction } from "../../actions/upload";
import { UploadOpts, UploadResponse } from "./types";

export async function uploadFile(opts: UploadOpts): Promise<UploadResponse> {
  //

  const formData = new FormData();
  formData.append("file", opts.file);
  formData.append("id", opts.id);
  formData.append("mimeType", opts.mimeType);

  const response = await uploadFileAction(formData);

  return response;
}
