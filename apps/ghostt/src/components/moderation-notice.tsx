"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/hooks/use-store";
import { infoStore } from "../lib/info-store";

const MOD_MESSAGE_MS = 2500;

/** Full-screen notice once a moderator has removed this player. */
export function RemovedOverlay() {
  const { removed } = useStore(infoStore);
  if (!removed) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black/85 text-center text-white">
      <p className="text-lg">{removed.reason}</p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
      >
        Reload
      </button>
    </div>
  );
}

/** Brief feedback for the local moderator's kick or ban. */
export function ModMessage() {
  const { modMessage } = useStore(infoStore);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!modMessage) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), MOD_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [modMessage?.at]);

  if (!modMessage || !visible) return null;

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 pointer-events-none rounded-xl bg-black/75 px-4 py-2 text-sm text-white/90">
      {modMessage.text}
    </div>
  );
}
