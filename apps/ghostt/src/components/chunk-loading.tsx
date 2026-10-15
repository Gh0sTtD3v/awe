"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/hooks/use-store";
import { infoStore } from "../lib/info-store";

/**
 * Chunks vary from under 2 MB to over 50 MB, so a crossing can be anything
 * from imperceptible to several seconds. Waiting a moment before showing the
 * indicator keeps the cheap chunks from flashing it on and straight back off.
 */
const SHOW_AFTER_MS = 200;

export function ChunkLoading() {
  const { chunkLoading } = useStore(infoStore);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!chunkLoading) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [chunkLoading]);

  if (!visible) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="flex items-center gap-2.5 rounded-full bg-black/70 backdrop-blur-sm px-4 py-2 text-white/90 text-sm border border-white/10 shadow-lg">
        <span
          aria-hidden
          className="h-3.5 w-3.5 rounded-full border-2 border-white/25 border-t-white animate-spin"
        />
        <span role="status">Loading area…</span>
      </div>
    </div>
  );
}
