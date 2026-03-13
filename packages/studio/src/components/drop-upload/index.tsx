import React, { useState, useEffect } from "react";
import SpriteIcon from "../../ui/sprite";
import { classes } from "../../utils/classes";

export function DropUpload({ accept, fileMaxWeight }) {
  const [isFaded, setIsFaded] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem("studio_shown_upload_prompt", "true");
      setIsFaded(true);
    }, 3500);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className={classes(
      "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[10px] bg-[rgba(18,18,18,0.8)] p-[25px] text-white text-2xl font-normal leading-7 w-[266px] cursor-pointer transition-opacity duration-500 ease-out-quad -z-[1] pointer-events-none",
      isFaded && "opacity-0"
    )}>
      <h2>Drag and drop from your files</h2>

      <div className="border border-dashed border-white/[0.88] p-[30px] flex items-center justify-center rounded-md my-5 mb-3">
        <span className="w-[58px] h-[58px] flex items-center justify-center bg-white/[0.12] rounded-[60px] [&_.loading-spinner]:w-5 [&_.icon]:fill-white">
          <SpriteIcon id="plus" width={16} height={16} />
        </span>
      </div>

      <p className="text-white/60 text-[13px] font-normal leading-[15px]">{accept.replaceAll(",", " ")}</p>
    </div>
  );
}
