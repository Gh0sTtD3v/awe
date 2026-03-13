import { uploadFile } from "../utils/uploader";
import { useEditorService } from "../contexts/editor-service-context";
import { useWorldEvent } from "./use-world-event";

export function useWorldUpdateHandler() {
  //
  const { editor } = useEditorService();

  useWorldEvent("WORLD_UPDATE_DATA", (e) => {
    //
    console.log("WORLD_UPDATE_DATA", e);

    editor.updateComponents(e.updates);
  });

  useWorldEvent("WORLD_UPLOAD_FILE", async ({ opts, resolve, reject }) => {
    //

    //
    try {
      const { file, id, mimeType, isUnique, overwrite } = opts;

      // let url = null

      // if (typeof file === "string") {
      //     url = file
      // } else {
      //     // create base 64 data url
      //     const reader = new FileReader()

      //     reader.onload = function (event) {
      //         url = event.target.result
      //         console.log("file read", url)
      //         resolve({ url, mimeType })
      //     }

      //     reader.readAsDataURL(file)
      // }

      let cResp = await uploadFile({
        file,
        mimeType,
        id,
        isUnique,
        overwrite,
      });

      resolve({
        url: cResp.url,
        mimeType: cResp.mimeType,
      });
      //
    } catch (err) {
      //
      console.error("WORLD_UPLOAD_FILE", err);

      reject(err);
    }
  });
}
