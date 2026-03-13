import React, { useState } from "react";

import { classes } from "../../../../utils/classes";
import SpriteIcon from "../../../../ui/sprite";
import Tip from "../../../../ui/tip";

export interface AddButtonProps {
  className?: string;
  label: string;
  icon?: string;
  onClick: React.MouseEventHandler;
}

export function AddButton({
  className = "",
  icon,
  label,
  onClick,
}: AddButtonProps) {
  const [hovering, setHovering] = useState(false);

  return (
    <button
      className={classes(
        className,
        "add-button",
        "group relative w-full h-full flex items-center justify-center aspect-[85/68]",
        "border border-dashed border-white/40 rounded-[10px] min-w-0 cursor-pointer"
      )}
      type="button"
      onClick={onClick}
      onMouseEnter={() => {
        setHovering(true);
      }}
      onMouseLeave={() => {
        setHovering(false);
      }}
    >
      <span className="flex items-center justify-center flex-shrink-0 size-[34px] bg-studio-dark rounded-[10px] transition-colors duration-200 ease-out-quad group-hover:bg-studio-gray-dark">
        <SpriteIcon id={icon} width={14} height={14} />
      </span>

      <span className="absolute bottom-1.5 left-0 px-2.5 pointer-events-none whitespace-nowrap w-full text-[11px] font-normal leading-[13px] max-w-full text-ellipsis overflow-hidden text-white/60 transition-colors duration-200 ease-out-quad group-hover:text-white">
        {label}
      </span>

      {hovering && (
        <Tip
          position="bottom"
          visible={hovering}
          closeState={() => {
            setHovering(false);
          }}
        >
          {label}
        </Tip>
      )}
    </button>
  );
}
