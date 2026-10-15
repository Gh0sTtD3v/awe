"use client";

import { useEffect } from "react";
import { useAuth } from "@oncyberio/studio";
import { useStore } from "@/hooks/use-store";
import { clearGateNotice, infoStore } from "../lib/info-store";

const VISIBLE_MS = 3500;

/**
 * Shown when the player is turned away: "Requires ≥ 100 ROIDS to enter Vault"
 * for a token gate, "Vault is members only" for a members-only chunk.
 */
export function GateNotice() {
  const { gateNotice } = useStore(infoStore);
  const { isAnonymous, cosmosAddress } = useAuth();

  useEffect(() => {
    if (!gateNotice) return;
    const timer = setTimeout(clearGateNotice, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [gateNotice?.at]);

  if (!gateNotice) return null;

  const isChunk = gateNotice.kind === "chunk";
  const hint = isAnonymous
    ? isChunk
      ? "Sign in to check your roles."
      : "Sign in with Keplr to check your wallet."
    : !isChunk && !cosmosAddress
      ? "Link your Keplr wallet to check your holdings."
      : null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        role="status"
        className="flex flex-col items-center gap-0.5 rounded-2xl bg-black/75 backdrop-blur-sm px-5 py-2.5 text-center text-white/90 text-sm border border-amber-400/30 shadow-lg"
      >
        {isChunk ? (
          <>
            <span>
              <strong className="text-amber-300">{gateNotice.label}</strong> is members only
            </span>
            {gateNotice.requirement && (
              <span className="text-white/70 text-xs">Roles: {gateNotice.requirement}</span>
            )}
          </>
        ) : (
          <span>
            Requires <strong className="text-amber-300">{gateNotice.requirement}</strong> to enter{" "}
            {gateNotice.label}
          </span>
        )}
        {hint && <span className="text-white/55 text-xs">{hint}</span>}
      </div>
    </div>
  );
}
