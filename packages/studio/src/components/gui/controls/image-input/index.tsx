import React, { useRef, useState } from "react";
import { sanitizeFilename } from "../../sanitize-filename";
import { useEventCallback } from "../../../../hooks/use-event-callback";
import { fileReaderPromisify } from "../../../../utils/file-reader";
import { showError } from "../../../../modals/context";
import { checkHDRDimensions } from "../../hdr-metadata";
import { uploadFile } from "../../../../utils/uploader";
import { UploadInput } from "../../../upload-input";

const MAX_UPLOAD_SIZE = 6; // MB

const MAX_IMAGE_DIMENSIONS = {
  width: 4096,
  height: 2048,
};

export async function checkImageDimensionsConstraints(
  file: File,
  buffer: ArrayBuffer,
  format: string,
  { width, height }: { width: number; height: number },
): Promise<boolean> {
  //
  if (format == ".hdr") {
    //
    const metadata = checkHDRDimensions(new Uint8Array(buffer) as any);

    if (typeof metadata === "number") {
      //
      throw new Error("Failed to parse HDR metadata.");
    }

    return !(metadata.width <= width && metadata.height <= height);
    //
  } else {
    //
    return new Promise((resolve, reject) => {
      //
      const img = new Image();

      const blob = new Blob([buffer], {
        type: file?.type,
      });

      const url = URL.createObjectURL(blob);

      img.onload = () => {
        // console.log({ w: img.width, h: img.height });
        const isTooLarge = !(img.width <= width && img.height <= height);

        resolve(isTooLarge);

        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        reject("Failed to load image.");

        URL.revokeObjectURL(img.src);
      };

      img.src = url;
    });
  }
}

interface ImageInputProps {
  value: any;
  onChange: (value: any) => void;
  accept?: string;
  display?: string;
  acceptLabel?: React.ReactNode;
  action?: string;
  maxDimensions?: { width: number; height: number };
  maxSize?: number;
}

function _ImageInput({
  value,
  onChange,
  accept = "*",
  display = "m",
  acceptLabel = null,
  action = "upload",
  maxDimensions = MAX_IMAGE_DIMENSIONS,
  maxSize = MAX_UPLOAD_SIZE,
}: ImageInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [isUploading, setUploading] = useState(false);

  const checkImageConstraints = async (
    file: File,
    buffer: ArrayBuffer,
    format: string,
  ) => {
    //
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      throw new Error(
        `The Image exceeds the maximum file size limit of ${maxSize}MB`,
      );
    }

    if (maxDimensions?.width && maxDimensions?.height) {
      //
      const isTooLarge = await checkImageDimensionsConstraints(
        file,
        buffer,
        format,
        maxDimensions,
      );

      if (isTooLarge) {
        //
        throw new Error(
          `The Image exceeds the maximum dimensions of ${maxDimensions.width}x${maxDimensions.height}`,
        );
      }
    }
  };

  const handleFileSelect = useEventCallback(
    //
    async (file: File) => {
      if (isUploading) return;

      setUploading(true);

      try {
        // const file = e.target?.files[0];

        if (!file) return;

        const name = sanitizeFilename(file?.name);

        const mimeType = file?.type || "raw";

        const format = "." + name.split(".").pop();

        if (!name) {
          showError("Please upload a file with a valid name and extension.");
          return;
        }

        let buffer = await fileReaderPromisify(file, {
          type: "buffer",
        });

        try {
          //
          await checkImageConstraints(file, buffer, format);
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
            if (buffer == null) {
              buffer = await fileReaderPromisify(file, {
                type: "buffer",
              });
            }

            const blob = new Blob([buffer], {
              type: file?.type,
            });

            const result = await uploadFile({
              file: blob,
              id: name,
              mimeType,
              isUnique: true,
              transform: null,
            });

            path = result.url;

            // @ts-ignore
            // fileRef.current.value = null;
            //
          } catch (err) {
            //
            console.error(err);

            showError("Error uploading file.");

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

        onChange({
          id: "custom",
          name,
          path,
          image: path,
          format,
          mimeType,
        });
      } catch (err) {
        //
        console.error(err);

        showError("Error processing file.");
      } finally {
        //
        setUploading(false);
      }
    },
    [],
  );

  const handleDelete = () => {
    onChange({
      id: "custom",
      name: null,
      path: null,
      image: null,
      format: null,
      mimeType: null,
    });
  };

  // const handleUploadClick = () => {
  //     // @ts-ignore
  //     fileRef.current.click();
  // };

  const name = value?.name || value?.path?.split("/").pop() || "Untitled";

  const previewUrl = value?.image || value?.path;

  // refactor this
  const preview =
    previewUrl && previewUrl.endsWith(".hdr")
      ? "https://cyber.mypinata.cloud/ipfs/QmTAQc4EEg4jv6n71NUFYqvVW6kbV9SsepXzUXcQfJLAe6"
      : previewUrl;

  return (
    <div>
      <UploadInput
        acceptLabel={acceptLabel}
        accept={accept}
        fileMaxWeight={10000}
        display={display}
        onUpload={handleFileSelect}
        onDelete={handleDelete}
        withBorder={true}
        preview={preview}
        hasFile={value?.path}
      />
    </div>
  );
}

export const ImageInput = React.memo(_ImageInput);
