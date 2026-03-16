import React from "react";
import { useEventCallback } from "../../../../hooks/use-event-callback";
import { fileReaderPromisify } from "../../../../utils/file-reader";
import { sanitizeFilename } from "../../sanitize-filename";
import { showError } from "../../../../modals/context";
import { uploadFile } from "../../../../utils/uploader";
import { UploadInput } from "../../../upload-input";
import { OptimizerServices } from "../../../../utils/uploader/optimizer";
import { OOAsset } from "@oncyberio/tools";

const MAX_UPLOAD_SIZE = 10; // MB

const iconStyle = { filter: "invert(1)" };

interface FileInputProps {
  value: any;
  note?: string | null;
  disabled?: boolean;
  onChange: (value: any) => void;
  acceptLabel?: React.ReactNode | null;
  prompt?: string;
  display?: string;
  accept?: string;
  action?: string;
  maxSize?: number;
}

function _FileInput({
  value,
  note = null,
  disabled = false,
  onChange,
  acceptLabel = null,
  prompt,
  display = "m",
  accept = "*",
  action = "file",
  maxSize = MAX_UPLOAD_SIZE,
}: FileInputProps) {
  const checkContraints = (file: File) => {
    //
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      throw new Error(
        `The file exceeds the maximum file size limit of ${maxSize}MB`
      );
    }
  };

  const handleFileSelect = useEventCallback(
    //
    async (file) => {
      // @ts-ignore
      // if (isUploading || disabled) return;
      try {
        if (!file) return;

        const name = sanitizeFilename(file?.name);

        let mimeType = file?.type || "raw";

        if (!name) {
          showError("Please upload a file with a valid name and extension.");
          return;
        }

        let buffer = await fileReaderPromisify(file, {
          type: "buffer",
        });

        try {
          //
          checkContraints(file);
          //
        } catch (err) {
          //
          console.error(err);

          showError(err.message);
          return;
        }

        let path;

        if (action === "upload") {
          //
          try {
            //
            const blob = new Blob([buffer], {
              type: file?.type,
            });

            const result = await uploadFile({
              file: blob,
              id: name,
              mimeType,
              isUnique: true,
            });

            path = result.url;

            mimeType = result.mimeType;

          } catch (err) {
            //
            console.error(err);

            showError("Error uploading file.");

            return;
          }
        } else if (action === "upload-optimize") {
          //
          try {
            //
            const blob = new Blob([buffer], {
              type: file?.type,
            });

            // Upload file first
            const result = await uploadFile({
              file: blob,
              id: name,
              mimeType,
              isUnique: true,
            });

            // Optimize the uploaded model
            const asset: OOAsset = {
              type: "model",
              url: result.url,
              mime_type: mimeType,
              hash: name,
            };

            const { optimized } = await OptimizerServices.optimizeAsset({ asset });

            // Return optimized paths object
            path = optimized.high;
            mimeType = result.mimeType;

            // Pass optimized data to onChange
            await onChange({
              id: "custom",
              name,
              path: optimized.high,
              optimized, // { high, low, low_compressed }
              mimeType,
            });
            return;
            //
          } catch (err) {
            //
            console.error(err);

            showError("Error optimizing file.");

            return;
            //
          }
        } else if (action === "dataUrl") {
          //
          const readerResult = await fileReaderPromisify(file, {
            type: "dataUrl",
          });

          path = readerResult;
          //
        }
        // else if ((action = "buffer")) {
        //     //
        //     contst readerResult = await fileReaderPromisify(file, {
        //         type: "buffer",
        //     });

        //     image = readerResult;
        //     //
        // }
        else if (action === "file") {
          //
          path = URL.createObjectURL(file);
        }

        await onChange({
          id: "custom",
          name,
          path,
          buffer: action === "buffer" ? buffer : undefined,
          mimeType,
        });
      } catch (err) {
        //
        console.error(err);

        showError("Error processing file.");
      }
    },
    []
  );

  const handleDelete = async () => {
    await onChange(null);
  };

  return (
    <div>
      <UploadInput
        acceptLabel={acceptLabel}
        prompt={prompt}
        accept={accept}
        fileMaxWeight={10000}
        onUpload={handleFileSelect}
        onDelete={handleDelete}
        display={display}
        withBorder={true}
        preview={value?.path || value?.image}
        hasFile={value?.path}
      />

      {note && note !== "" && <p className="pt-[9px] px-[5px] pb-0 text-white/40 text-[11px] font-normal leading-[13px]">{note}</p>}
    </div>
  );
}

export const FileInput = React.memo(_FileInput);
