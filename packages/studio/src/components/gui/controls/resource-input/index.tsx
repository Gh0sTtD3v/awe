import { ChangeEvent, memo, useState } from "react";
import { sanitizeFilename } from "../../sanitize-filename";
import { useEventCallback } from "../../../../hooks/use-event-callback";
import { fileReaderPromisify } from "../../../../utils/file-reader";
import { showError } from "../../../../modals/context";
import { uploadFile } from "../../../../utils/uploader";
import { classes } from "../../../../utils/classes";
import { LoadingSpinner } from "../../../../ui/loading-spinner";
import SpriteIcon from "../../../../ui/sprite";
import DragDestination from "../../../drag-destination";
import { HoverLabel, SimpleLabel } from "../shared/label";
import {
  TEXT_READONLY,
  INPUT_ACTION_CONTAINER,
  GLASSMORPHIC_BUTTON,
  FLEX_CENTER_ALL
} from "../../../../ui/utils/tailwind-classes";

const MAX_UPLOAD_SIZE = 6; // MB

interface ResourceInputProps {
  value: any;
  onChange: (value: any) => void;
  type: string | { name: string };
  required?: boolean;
  maxSize?: number;
}

// TODO need to upload using the uploader
function _ResourceInput({
  value,
  onChange,
  type,
  required = true,
  maxSize = MAX_UPLOAD_SIZE,
}: ResourceInputProps) {
  const _maxSize = maxSize * 1024;

  const [isUploading, setUploading] = useState(false);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isWrongType, setIsWrongType] = useState(false);
  const [label, setLabel] = useState("Uploading...");

  let accept = "";
  switch (type) {
    case "audio":
      accept = "audio/*";
      break;
    case "video":
      accept = "video/*";
      break;
    case "image":
      accept = "image/*";
      break;
    case "model":
      accept = ".glb";
      break;
    case "avatar":
      accept = ".vrm";
      break;
  }

  const canAcceptFile = !!accept;
  const name = value?.name || value?.url?.split("/")?.pop();
  const typeLabel = typeof type === "string" ? type : type?.name;
  const isDefined = !!value?.url;

  const silentErrorWith = (message: string) => {
    setUploading(false);
    setIsWrongType(true);
    setLabel(message);
    setTimeout((_) => setIsWrongType(false), 1000);
  };

  const error = (message: string) => {
    showError(message);
    setUploading(false);
  };

  const handleFile = useEventCallback(async (file: any) => {
    if (isUploading) return;
    if (!file) return;
    setUploading(true);
    setLabel("Uploading...");

    try {
      const name = sanitizeFilename(file?.name);
      if (!name) error("Please upload a file with a valid name and extension.");

      const mimeType = file.type || "raw";
      const buffer = await fileReaderPromisify(file, { type: "buffer" });
      if (file.size > _maxSize * 1024)
        return error(
          `The Image exceeds the maximum file size limit of ${maxSize}MB`
        );

      const blob = new Blob([buffer], { type: file.type });
      const result = await uploadFile({
        file: blob,
        id: name,
        mimeType,
        isUnique: true,
        transform: null,
      });

      onChange({
        $$paramType: "resource",
        name,
        url: result.url,
        mimeType: result.mimeType,
      });
    } catch (err) {
      console.error(err);
      showError("Error processing file.");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleResource = (resource: any) => {
    setUploading(true);
    setLabel("Copying...");
    if (resource.dataType !== "resource")
      return silentErrorWith("Not a Resource");
    if (!resource?.url) return silentErrorWith("Resource has no content");
    if (resource.type !== type) return silentErrorWith("Wrong Resource Type");
    onChange({
      $$paramType: "resource",
      name: resource.name || "unknown",
      url: resource.url,
      mimeType: resource.mime_type,
    });
    setUploading(false);
  };

  const handleNewData = (data, files) => {
    setIsDraggedOver(false);
    if (data) {
      handleResource(data);
    } else if (files?.[0]) {
      handleFile(files[0]);
    }
  };

  const handleDelete = () => onChange(null);

  const openFileInput = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = accept;
    fileInput.addEventListener("change", (e: any) => {
      if (e.target?.files?.length > 0) handleFile(e.target.files[0]);
      fileInput.remove();
    });
    fileInput.click();
  };

  let content = null;
  switch (true) {
    case isUploading: {
      content = (
        <>
          <div className={TEXT_READONLY}>{label}</div>
          <LoadingSpinner light={true} />
        </>
      );
      break;
    }
    case isWrongType: {
      content = <div className="pointer-events-none whitespace-pre-wrap w-full text-[11px] font-normal leading-[13px] max-w-full text-white/60">{label}</div>;
      break;
    }
    case isDefined: {
      content = (
        <>
          <div className={TEXT_READONLY}>
            {name.length > 25 ? `${name.slice(0, 25)}...` : name}
          </div>
          <div className={INPUT_ACTION_CONTAINER}>
            {canAcceptFile && (
              <HoverLabel
                pop={<SimpleLabel>Replace</SimpleLabel>}
                className={GLASSMORPHIC_BUTTON}
                onClick={openFileInput}
              >
                <SpriteIcon id="studio/replace" width={13} height={13} />
              </HoverLabel>
            )}
            <HoverLabel
              pop={<SimpleLabel>Unset</SimpleLabel>}
              type="button"
              className="cursor-pointer backdrop-blur-[12.5px] w-[22px] h-[22px] rounded-[30px] flex items-center justify-center pointer-events-auto bg-white/30 text-white hover:bg-white/50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete();
              }}
            >
              <SpriteIcon id="studio/trash-filled" width={12} height={12} />
            </HoverLabel>
          </div>
        </>
      );
      break;
    }
    case canAcceptFile: {
      content = (
        <>
          <div className={TEXT_READONLY}>{`No ${typeLabel} resource`}</div>
          <div className={INPUT_ACTION_CONTAINER}>
            <HoverLabel
              pop={<SimpleLabel>Upload</SimpleLabel>}
              className="cursor-pointer backdrop-blur-[12.5px] w-[22px] h-[22px] rounded-[30px] flex items-center justify-center pointer-events-auto bg-white/30 text-white hover:bg-white/50"
              onClick={openFileInput}
            >
              <SpriteIcon id="studio/plus" width={10} height={10} />
            </HoverLabel>
          </div>
        </>
      );
      break;
    }
    default: {
      content = (
        <span className={TEXT_READONLY}>{`No ${typeLabel} resource`}</span>
      );
      break;
    }
  }

  return (
    <div>
      <DragDestination
        onDragOver={(_) => setIsDraggedOver(true)}
        onDragLeave={(_) => setIsDraggedOver(false)}
        onReceiveData={handleNewData}
      >
        <div
          className={classes(
            "upload-input relative w-full flex items-center justify-center h-[34px] min-h-[34px] rounded-lg bg-white/5 border border-dashed border-white/40",
            !isDefined && required && "bg-[rgba(150,23,23,0.219)]",
            isDraggedOver && "bg-studio-gray-medium",
            isWrongType && "bg-[rgba(150,23,23,0.219)] border-[rgba(255,0,0,0.767)] cursor-not-allowed"
          )}
        >
          <div className={classes(
            "pt-[2px] pl-[5px] pr-[3px] text-white/80 opacity-30",
            isDefined && "opacity-100"
          )}>
            <SpriteIcon id="studio/file" width={18} height={18} />
          </div>
          <div className={`${FLEX_CENTER_ALL} w-full h-full pr-0 pl-1.5`}>{content}</div>
        </div>
      </DragDestination>
    </div>
  );
}

export const ResourceInput = memo(_ResourceInput);
