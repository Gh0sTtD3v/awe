import useSWR from "swr";
import { getUploader, getSWRUploadKey } from "../services/uploader/utils";

const swrOptions = {
  revalidateOnFocus: false,
  refreshInterval: 0,
};

export function useUserUploads() {
  const uploader = getUploader();

  return useSWR(
    getSWRUploadKey("admin"),
    () => uploader.fetchUploads(),
    swrOptions
  );
}
