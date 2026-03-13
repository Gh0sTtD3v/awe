import React, { useState, useRef } from "react";
import { classes } from "../../utils/classes";
import Tip from "../../ui/tip";
import SpriteIcon from "../../ui/sprite";
import { showError } from "../../modals/context";
import { LoadingSpinner } from "../../ui/loading-spinner";
import { getUploadErrorMsg } from "../../services/uploader/utils";

export interface UploadInputProps {
  className?: string;
  accept?: string;
  acceptLabel?: React.ReactNode;
  note?: string;
  prompt?: string;
  withBorder: boolean;
  hasFile: string | null;
  display?: string;
  preview?: string;
  title?: string;
  fileMaxWeight?: number;
  onDelete?: () => void | Promise<void>;
  onUpload?: (file: File) => Promise<void>;
}

export function UploadInput({
  className = "",
  accept,
  acceptLabel,
  prompt: promptText,
  withBorder = false,
  preview,
  hasFile,
  title = null,
  display = "m", // s || m
  onDelete,
  onUpload,
}: UploadInputProps) {
  const [draggedOver, setDraggedOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Uploading...");

  const [showTip, setShowTip] = useState(false);

  const inputFile = useRef(null);

  const handleFiles = async (file) => {
    setLoadingLabel("Uploading...");
    setIsUploading(true);

    //
    try {
      await onUpload(file);
    } catch (error) {
      console.log("error", error);

      const { title, message } = getUploadErrorMsg(error);

      showError(message, title);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    const res = onDelete();

    if (res instanceof Promise) {
      //
      setLoadingLabel("Deleting...");
      setIsUploading(true);

      await res;

      setIsUploading(false);
    }
  };

  function getFilenameExtension(fileName) {
    const fileExtension = fileName.split(".").pop().toLowerCase();
    return fileExtension;
  }

  function verifyFileExtensionIsImage(fileName) {
    // Extracting the file extension
    const fileExtension = getFilenameExtension(fileName);

    // Checking if the file extension matches either png or jpg
    if (fileExtension === "png" || fileExtension === "jpg") {
      return true; // Extension is valid
    } else {
      return false; // Extension is not valid
    }
  }

  return (
    <div
      className={classes(
        className,
        "upload-input",
        // Base container
        "relative w-full h-full flex items-center justify-center col-span-2 aspect-[250/143] [&_.icon]:text-white",
        // Display variants
        display === "s" && "h-7 min-h-7 rounded-lg",
        display === "m" &&
          hasFile &&
          "bg-[length:45px_auto] bg-no-repeat bg-center",
        display === "m" &&
          hasFile &&
          `upload-input-file-${getFilenameExtension(preview)}`,
        // Bordered variant
        withBorder &&
          "bg-[rgba(32,32,32,0.4)] border border-dashed border-white/40 rounded-[10px] transition-[background,border-color] duration-200 ease-out-quad",
        withBorder &&
          !isUploading &&
          "hover:bg-[rgba(32,32,32,0.6)] hover:border-white/60",
        withBorder && hasFile && display !== "s" && "border-solid",
        // Dragged over
        draggedOver && "bg-studio-gray-medium rounded-[10px]",
      )}
      style={
        preview && verifyFileExtensionIsImage(preview) && display !== "s"
          ? {
              backgroundImage: `url(${preview})`,
              backgroundSize: "cover",
            }
          : null
      }
      onMouseEnter={() => {
        setShowTip(true);
      }}
      onMouseLeave={() => {
        setShowTip(false);
      }}
    >
      <label
        className={classes(
          "flex items-center justify-center w-full h-full cursor-pointer shrink-0",
          display === "s" && "px-0 pr-1.5",
          display === "m" && hasFile && "pointer-events-none",
          isUploading && "cursor-default",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDraggedOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDraggedOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files[0]);
          setDraggedOver(false);
        }}
        onClick={(e) => {
          //
        }}
      >
        {isUploading ? (
          <>
            <LoadingSpinner light={true} />
            <span
              className={classes(
                "absolute bottom-1.5 left-0 px-2.5 pointer-events-none whitespace-pre-wrap w-full text-[13px] font-normal leading-[15px] max-w-full text-white/60 transition-colors duration-200 ease-out-quad",
                display === "s" && "text-white",
              )}
            >
              {loadingLabel}
            </span>
          </>
        ) : hasFile && display === "s" ? (
          <>
            <span
              className={classes(
                "absolute bottom-1.5 left-0 px-2.5 pointer-events-none whitespace-pre-wrap w-full text-[13px] font-normal leading-[15px] max-w-full text-white/60 transition-colors duration-200 ease-out-quad",
                display === "s" &&
                  "text-white text-ellipsis overflow-hidden pr-9",
              )}
            >
              {hasFile.startsWith("http") ? hasFile.split("/").pop() : hasFile}
            </span>
          </>
        ) : (
          <>
            {!hasFile && (
              <>
                <div
                  className={classes(
                    "flex items-center justify-center shrink-0 w-[31.466px] h-[31.466px] bg-white/[0.08] rounded-full transition-colors duration-200 ease-out-quad [&_.icon]:text-white/40 [&_.icon]:transition-colors [&_.icon]:duration-200 [&_.icon]:ease-out-quad",
                    display === "s" &&
                      "ml-auto w-[22px] h-[22px] bg-transparent",
                  )}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="9"
                    height="9"
                    fill="none"
                    viewBox="0 0 9 9"
                  >
                    <path
                      stroke="#fff"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.049"
                      d="M4.65 1.226v3.146m0 0V7.52m0-3.147H1.504m3.146 0h3.147"
                    ></path>
                  </svg>
                </div>

                {title ? (
                  <span className="absolute bottom-0 left-0 px-0 pointer-events-none whitespace-pre-wrap w-full text-[7.692px] font-normal leading-[9.09px] max-w-full text-white/40 transition-colors duration-200 ease-out-quad">
                    {title}
                  </span>
                ) : (
                  <span
                    className={classes(
                      "absolute bottom-1.5 left-0 px-2.5 pointer-events-none whitespace-pre-wrap w-full text-[13px] font-normal leading-[15px] max-w-full text-white/60 transition-colors duration-200 ease-out-quad",
                      display === "s" && "bottom-auto",
                    )}
                  >
                    {promptText || "Upload"}
                  </span>
                )}

                <input
                  ref={inputFile}
                  type="file"
                  className="absolute top-0 left-0 w-full h-full -z-20 opacity-[0.001]"
                  onChange={(e) => {
                    const file = inputFile.current.files[0];
                    handleFiles(file);
                  }}
                  accept={accept}
                />
              </>
            )}
          </>
        )}

        {showTip && (
          <Tip
            position="bottom"
            closeState={() => {
              setShowTip(false);
            }}
            visible={showTip}
            maxWidth={150}
          >
            {acceptLabel ? (
              acceptLabel
            ) : (
              <>
                .png .jpg
                <br />
                .mp4 .mp3 .glb .vrm
              </>
            )}
          </Tip>
        )}

        {onDelete && hasFile && !isUploading && (
          <button
            type="button"
            className={classes(
              "absolute bottom-2 right-2 bg-[rgba(18,18,18,0.6)] w-7 h-7 rounded-lg flex items-center justify-center pointer-events-auto [&_.icon]:text-white",
              display === "s" &&
                "w-[22px] h-[22px] bottom-0.5 bg-transparent right-1.5 opacity-40 transition-opacity duration-200 ease-out-quad",
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDelete();
            }}
          >
            <SpriteIcon id="studio/trash-filled" width={14} height={14} />
          </button>
        )}
      </label>
    </div>
  );
}
