import React from "react";
import { cn } from "../../utils/cn";

const SPINNER_BG_URL =
  "url(https://cyber.mypinata.cloud/ipfs/QmUsQpNGNQvZUrQTARvBosNtWxdAiBEvUNUERvK6N91uM1?filename=spinner.svg)";

export function LoadingSpinner({
  light = false,
  width = 42,
  height = 42,
  className = "",
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center",
        "loading-spinner",
        className,
      )}
    >
      <span
        className={cn("animate-spin bg-contain bg-center bg-no-repeat")}
        style={{ width, height, backgroundImage: SPINNER_BG_URL }}
      />
    </div>
  );
}
