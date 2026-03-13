import React, { useId } from "react";

import { classes } from "../../../../utils/classes";
import SpriteIcon from "../../../../ui/sprite";

export interface CheckboxProps {
  label: string;
  display?: "row" | "column";
  value: boolean;
  onChange: (value: boolean) => void;
}

function _Checkbox({ label, display, value, onChange }: CheckboxProps) {
  const id = useId();

  const handleChange = (e: any) => {
    onChange(e.target.checked);
  };

  const isRow = display === "row";

  return (
    <div
      className={classes(
        "w-full flex items-center rounded-lg bg-studio-dark",
        isRow && "border-t-0 border-l-0 border-r-0 rounded-none"
      )}
    >
      <input
        data-noundo={true}
        id={id}
        type="checkbox"
        className="h-0 w-0 invisible absolute"
        checked={value}
        onChange={handleChange}
      />

      <label
        className="py-[7px] px-[9px] flex items-center justify-between cursor-pointer relative text-white text-[13px] font-normal leading-[15px] w-full transition-colors duration-300 ease-out-quad"
        htmlFor={id}
      >
        {label && label}
        <span
          className={classes(
            isRow
              ? "size-4 flex-shrink-0 rounded border border-white/20 flex items-center justify-center"
              : "w-7 h-3.5 rounded-md bg-studio-gray-dark relative transition-colors duration-300 ease-out-quad before:absolute before:top-0 before:left-0 before:size-3.5 before:content-[''] before:rounded-md before:bg-studio-gray before:transition-[transform,background-color] before:duration-300 before:ease-out-quad",
            isRow && value && "[&_.icon]:opacity-100",
            !isRow && value && "bg-white/[0.08] before:bg-white before:translate-x-full"
          )}
        >
          {display && (
            <SpriteIcon
              id="check"
              width={8}
              height={8}
              className={classes(
                "fill-white transition-opacity duration-300 ease-out-quad",
                value ? "opacity-100" : "opacity-0"
              )}
            />
          )}
        </span>
      </label>
    </div>
  );
}

export const Checkbox = React.memo(_Checkbox);
