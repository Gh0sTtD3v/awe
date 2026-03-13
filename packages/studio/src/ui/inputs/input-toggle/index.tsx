import React from "react";
import { nanoid } from "nanoid";
import { cn } from "../../../utils/cn";

export function InputToggle({
  id = null,
  label,
  value,
  name,
  color,
  onChange,
  className,
}) {
  const inputId = id || nanoid();

  const handleChange = (e: any) => {
    if (onChange) {
      onChange(e);
    }
  };

  const isBlack = color === "black";
  const isWhite = color === "white";

  return (
    <div
      className={cn(
        "w-full flex items-center rounded-lg border border-white/[0.08]",
        isBlack && [
          "border-[rgba(18,18,18,0.12)]",
          "[&_.toggle-label]:text-[rgba(18,18,18,0.6)]",
          "[&_.toggle-ui]:bg-[rgba(18,18,18,0.12)]",
          "[&_.toggle-ui]:before:bg-studio-darker",
          "[&_input:checked~.toggle-label]:text-studio-darker",
          "[&_input:checked~.toggle-label_.toggle-ui]:bg-[rgba(18,18,18,0.12)]",
        ],
        isWhite && [
          "bg-studio-dark border-0",
          "[&_.toggle-label]:text-white/60",
          "[&_.toggle-ui]:bg-white/[0.12]",
          "[&_.toggle-ui]:before:bg-white",
          "[&_input:checked~.toggle-label]:text-white",
          "[&_input:checked~.toggle-label_.toggle-ui]:bg-white/[0.12]",
        ],
        className
      )}
    >
      <input
        data-noundo={true}
        id={inputId}
        type="checkbox"
        className={cn(
          "h-0 w-0 invisible absolute",
          "[&:checked~.toggle-label]:text-white",
          "[&:checked~.toggle-label_.toggle-ui]:bg-white/[0.08]",
          "[&:checked~.toggle-label_.toggle-ui]:before:opacity-100",
          "[&:checked~.toggle-label_.toggle-ui]:before:translate-x-full"
        )}
        defaultChecked={value}
        name={name}
        onChange={handleChange}
      />

      <label
        className={cn(
          "toggle-label",
          "gap-1.5 p-[9px] flex items-center justify-between",
          "cursor-pointer relative text-white/60",
          "text-[11px] font-normal leading-[13px] w-full",
          "transition-[color] duration-300 ease-out-quad"
        )}
        htmlFor={inputId}
      >
        {label && label}
        <span
          className={cn(
            "toggle-ui",
            "w-7 h-3.5 rounded-[4px] bg-white/[0.08] relative",
            "transition-[background-color] duration-300 ease-out-quad",
            "before:absolute before:top-0 before:left-0",
            "before:w-3.5 before:h-3.5 before:content-['']",
            "before:rounded-[4px] before:bg-white before:opacity-20",
            "before:transition-[transform,opacity] before:duration-300 before:ease-out-quad"
          )}
        />
      </label>
    </div>
  );
}
