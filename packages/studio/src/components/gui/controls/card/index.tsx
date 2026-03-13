import React from "react";

import { classes } from "../../../../utils/classes";

export interface CardProps {
  image: string;
  alt?: string;
  label?: string | null;
  selected?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  objectFit?: "cover" | "contain";
}

function _Card({
  image,
  alt = "",
  label = null,
  selected = false,
  disabled = false,
  onClick = null,
  objectFit = "contain" as "cover" | "contain",
}) {
  return (
    <button
      className={classes(
        "flex flex-col cursor-pointer w-full",
        disabled && "opacity-30 pointer-events-none cursor-not-allowed",
        selected && "[&_.card-wrapper]:before:opacity-60"
      )}
      onClick={onClick}
    >
      <div className="card-wrapper aspect-square relative w-full [&_img]:absolute [&_img]:top-[3px] [&_img]:left-[3px] [&_img]:w-[calc(100%-6px)] [&_img]:h-[calc(100%-6px)] [&_img]:block [&_img]:object-contain [&_img]:rounded">
        <div>
          <img src={image} title={alt} style={{ objectFit }} />
        </div>
      </div>
      {label && (
        <label className="mt-2.5 block w-full text-center text-white/60 text-[11px] font-normal leading-[13px]">
          {label}
        </label>
      )}
    </button>
  );
}

export const Card = React.memo(_Card);
