import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { NextImage } from "../next-image";

interface IconImageProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number;
  height?: number;
  size?: number;
  name: string;
  className?: string;
  image?: boolean;
  color?: string;
  onClick?: (e: React.MouseEvent) => unknown;
  mode?: "light" | "";
}

const basePath = "./icons";

function Icon(props: IconImageProps) {
  const width = props?.size || props?.width;
  const height = props?.size || props?.height;

  return (
    <div
      className={cn("cursor-pointer flex items-center justify-center", props.className)}
      style={{
        width,
        height,
        minWidth: width,
        minHeight: height,
        ...(props.style ?? {}),
      }}
      onClick={props.onClick}
    >
      <NextImage
        unoptimized
        {...(width && height ? { width, height } : { fill: true })}
        alt={`${props.name} icon`}
        src={`/icons/${props.name}.svg`}
        style={{
          filter: props.mode === "light" ? "invert(1)" : "invert(0)",
        }}
      />
    </div>
  );
}

export default memo(Icon);
