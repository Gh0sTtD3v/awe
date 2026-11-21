"use client";

import { useEffect } from "react";
import { useStore } from "@/hooks/use-store";
import { getScript } from "../lib/game-script";
import { infoStore } from "../lib/info-store";

const TOGGLE_KEY = "KeyE";

/** Screens and lifts use E too; when one is in reach it keeps the key. */
function otherUsesKey() {
  const { nearScreen, nearLift } = infoStore.state;
  return !!nearScreen?.canControl || !!nearLift;
}

/**
 * Next to a seat: "E Sit". Sitting: "E Stand up" (moving or jumping also
 * stands up). The prompt is a button too, for touch screens.
 */
export function SeatControls() {
  const { nearSeat, seated } = useStore(infoStore);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== TOGGLE_KEY || e.repeat) return;
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const { nearSeat, seated } = infoStore.state;
      if (!seated && (!nearSeat || otherUsesKey())) return;
      getScript()?.toggleSit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!seated && !nearSeat) return null;

  return (
    <button
      onClick={() => getScript()?.toggleSit()}
      className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-black/70 px-4 py-2 text-sm text-white/90 backdrop-blur-sm hover:bg-black/80"
    >
      <kbd className="rounded-md border border-white/20 px-2 py-0.5 font-mono text-xs font-bold">E</kbd>
      <span>{seated ? "Stand up" : nearSeat?.prompt}</span>
    </button>
  );
}
