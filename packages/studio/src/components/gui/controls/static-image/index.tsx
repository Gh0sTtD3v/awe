import React from "react";

import { classes } from "../../../../utils/classes";
import { NextImage } from "../../../../ui/next-image";

interface StaticImageProps {
  alt?: string;
  image: string;
  disabled: boolean;
  backgroundColor: string;
}

function _StaticImage({
  alt = "",
  image,
  disabled,
  backgroundColor = "transparent",
}: StaticImageProps) {
  return (
    <div
      className={classes(
        "relative min-h-[121px] w-full bg-studio-black rounded overflow-hidden",
        disabled && "[&_img]:opacity-20"
      )}
      style={{ backgroundColor }}
    >
      <NextImage
        alt={alt}
        width={252}
        height={121}
        src={image}
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}

export const StaticImage = React.memo(_StaticImage);
