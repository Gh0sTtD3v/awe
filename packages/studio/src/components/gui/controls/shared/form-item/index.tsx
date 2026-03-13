import React, { useState } from "react";
import { classes } from "../../../../../utils/classes";
import SpriteIcon from "../../../../../ui/sprite";
import Tip from "../../../../../ui/tip";

const layoutStyles = {
  inline: "flex-row items-start flex-nowrap gap-1.5 [&>.label]:flex-[0_0_100px] [&>.controller]:flex-1",
  stacked: "flex-col gap-1 items-start mb-0.5 [&>.label]:w-full [&>.controller]:w-full",
};

export function FormItem({
  layout = "inline",
  config,
  label,
  children,
  style = {},
}: {
  layout?: "inline" | "stacked";
  label?: string;
  config?: any;
  styles?: Record<string, React.CSSProperties>;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  //

  const [showInfo, setShowInfo] = useState(false);

  const labelStyle = (style as any)?.label ?? {};

  const info = config?.info ?? "";

  return (
    <div
      className={classes(
        "flex select-none form-item",
        layoutStyles[layout]
      )}
      style={style}
    >
      {label && (
        <div className="flex flex-row items-center w-full max-h-6">
          <label
            className="flex items-center justify-start gap-1.5 text-white/60 text-[13px] font-normal leading-[15px] mb-0.5 overflow-hidden whitespace-nowrap text-ellipsis capitalize select-none"
            style={labelStyle}
          >
            {label}
            {info && (
              <button
                type="button"
                className="relative"
                onClick={() => {
                  setShowInfo(true);
                }}
                onMouseLeave={() => {
                  setShowInfo(false);
                }}
              >
                <SpriteIcon
                  id="studio/info-circle"
                  className="text-current"
                  width={18}
                  height={18}
                />

                {showInfo && (
                  <Tip
                    visible={showInfo}
                    limitIsScrollable={true}
                    closeState={() => {
                      setShowInfo(false);
                    }}
                    maxWidth={150}
                  >
                    {config?.info}
                  </Tip>
                )}
              </button>
            )}
          </label>
        </div>
      )}

      <div className="w-full">{children}</div>
    </div>
  );
}
