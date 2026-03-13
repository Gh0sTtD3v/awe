import React, { useEffect, useRef, useState } from "react";
import { cn } from "../../../utils/cn";
import { uploadFile } from "../../../utils/uploader";
import SpriteIcon from "../../sprite";
import { fileReaderPromisify } from "../../../utils/file-reader";
import { LoadingSpinner } from "../../loading-spinner";

export interface InputImageUploadProps
  extends React.HTMLAttributes<HTMLInputElement> {
  className?: string;
  placeholder?: string;
  label: string;
  type?: string;
  hasError?: boolean;
  disabled?: boolean;
  maxSize?: number;
  formatFeedback?: string;
  accept?: string;
}

export function InputImageUpload({
  className,
  id,
  label = "Email",
  defaultValue,
  hasError,
  disabled,
  formatFeedback,
  maxSize = null, // in MB
  children,
  onChange,
  placeholder = "",
  ...rest
}: InputImageUploadProps) {
  const container = useRef(null);

  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const [error, setError] = useState(null);

  const handleChange = async (e) => {
    let val = null;

    setPreview(null);
    setError(null);
    setLoading(false);

    const file = container.current.files[0];

    let mimeType = file?.type || "raw";

    const name = file?.name;

    if (maxSize && file.size > maxSize * 1000000) {
      setError(`Maximum file size : ${maxSize}Mb`);
      return;
    }

    if (!file.type.includes("image")) {
      setError("Only images are supported");
      return;
    }

    setLoading(true);

    const buffer = await fileReaderPromisify(file, {
      type: "buffer",
    });

    const blob = new Blob([buffer], {
      type: file?.type,
    });

    const result = await uploadFile({
      file: blob,
      id: name,
      mimeType,
      isUnique: true,
    });

    val = result.url as string;

    if (!val) {
      setError("Failed to upload image");
      setLoading(false);
      return;
    }

    setValue(val);

    setLoading(false);

    if (onChange) onChange(val);
  };

  const onRemove = (e) => {
    console.log("remove");
    e.preventDefault();
    e.stopPropagation();
    container.current.value = "";
    setValue(null);
    onChange(null);
  };

  useEffect(() => {
    if (defaultValue) {
      setValue(defaultValue as string);
      setPreview(defaultValue);
    }
  }, [defaultValue]);

  return (
    <label
      htmlFor={id}
      className={cn(
        "input-base-container",
        "relative flex flex-row w-full [&_input]:absolute [&_input]:top-0 [&_input]:left-[10px] [&_input]:h-px [&_input]:w-px [&_input]:opacity-[0.1] [&_input]:-z-10",
        hasError ? "error" : "",
        disabled ? "disabled" : "",
        className
      )}
    >
      <div
        className={cn(
          "grow flex items-center justify-between px-5 py-3 border border-dashed border-white/40 rounded-xl bg-studio-dark/40 text-white/60 transition-colors duration-200 [transition-timing-function:var(--ease-out-quad)] hover:text-white"
        )}
      >
        <span
          className={cn(
            "flex flex-col text-white text-[15px] font-normal leading-[17px] grow"
          )}
        >
          {label}

          {error ? (
            <span
              className={cn(
                "inline-flex gap-1.5 text-studio-error items-center [&_.icon]:shrink-0"
              )}
            >
              <SpriteIcon id="danger" width={13} height={11} />
              {error}
            </span>
          ) : formatFeedback ? (
            <span className={cn("text-white/60")}>{formatFeedback}</span>
          ) : null}
        </span>

        <div
          className={cn(
            "w-[60px] h-[calc(100%+24px)] flex items-center justify-center -mr-5"
          )}
        >
          {loading ? (
            <LoadingSpinner light width={20} height={20} />
          ) : value ? (
            <button
              type="button"
              className={cn(
                "w-full h-full flex items-center justify-center text-white/40 transition-colors duration-200 [transition-timing-function:var(--ease-out-quad)] hover:text-white"
              )}
              onClick={onRemove}
            >
              <SpriteIcon id="studio/trash-filled" width={20} height={20} />
            </button>
          ) : (
            <SpriteIcon id="studio/upload" width={20} height={20} />
          )}
        </div>
      </div>

      <div
        className={cn(
          "shrink-0 w-[60px] h-[60px] relative flex items-center justify-center bg-studio-dark rounded-xl overflow-hidden ml-3 [&_img]:absolute [&_img]:top-0 [&_img]:left-0 [&_img]:w-full [&_img]:h-full [&_img]:block [&_img]:object-cover"
        )}
      >
        {preview && value ? (
          <img src={preview} alt="" />
        ) : (
          <SpriteIcon id="studio/publish" width={32} height={32} />
        )}
      </div>

      <input
        ref={container}
        id={id}
        name={id}
        type={"file"}
        onChange={handleChange}
        {...rest}
      />
    </label>
  );
}
