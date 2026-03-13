import React from "react";

import { classes } from "../../../../utils/classes";
import SpriteIcon from "../../../../ui/sprite";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  type?: string;
  error?: string;
}

export const Input = ({
  type = "text",
  error = null,
  onChange = null,
  innerRef = null,
  ...rest
}) => {
  const change = (e) => onChange(e.currentTarget.value);
  return (
    <div
      className={classes(
        "flex flex-col justify-center gap-1.5 min-w-0 mb-3",
        "input"
      )}
    >
      <input
        type={type}
        onChange={change}
        ref={innerRef}
        className={classes(
          "w-full relative rounded-[10px] outline-none h-7 py-2.5 px-[10px] pl-[13px] bg-transparent",
          "text-white text-[13px] font-normal leading-[15px]",
          "flex items-center justify-start gap-2 border-0 bg-studio-dark",
          "transition-colors duration-300 ease-out-quad",
          "[&_.icon]:text-white/40 [&_.icon]:transition-colors [&_.icon]:duration-300 [&_.icon]:ease-out-quad",
          "hover:bg-studio-gray-dark hover:outline-none",
          "focus-within:bg-studio-gray-dark focus-within:outline-none",
          "focus:outline-none",
          error && "border border-studio-error"
        )}
        {...rest}
      />

      {error && (
        <p className="text-studio-error px-[13px] text-[13px] leading-[1.17] inline-flex items-center [&_.icon]:mr-[7px]">
          <SpriteIcon id="alert" width={12} height={12} />
          {error}
        </p>
      )}
    </div>
  );
};
