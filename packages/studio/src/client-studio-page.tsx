"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useEffectOnce } from "./hooks/use-effect-once";
import { GameData } from "./types/game-data";
import { AuthProvider, useAuth } from "./contexts/auth-context";
import { AccessProvider, useAccess } from "./contexts/access-context";
import { PrivyAuthProvider } from "./contexts/privy-provider";
import { AvatarProvider } from "./contexts/avatar-context";
import { MaestroProvider } from "./contexts/maestro-context";
import { ClientGameService } from "./services/client-game-service";
import { createCssGradients } from "./ui/gradients";
import { DialogProvider } from "./modals/context";
import { SpriteProvider } from "./ui/sprite/sprite-provider";

const StudioUI = dynamic(
  () => import("./components/studio-ui").then((mod) => mod.StudioUI),
  { ssr: false }
);

/** The editor is for builders only; the server refuses edits from anyone else regardless. */
function StudioGate() {
  const { me, can } = useAccess();
  const { isAnonymous, login, loginWithKeplr, logout } = useAuth();

  if (!me) return null;
  if (can("build")) return <StudioContent />;

  const message = me.banned
    ? "You are banned from this world."
    : isAnonymous
      ? "Sign in to edit this world."
      : "You don't have permission to edit this world. Ask the owner for a role with Build.";

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-black px-6 text-center text-sm text-white">
      <p className="text-white/80">{message}</p>
      <div className="flex gap-2">
        {isAnonymous ? (
          <>
            <button onClick={login} className="rounded-lg bg-white/90 px-4 py-2 font-medium text-black hover:bg-white">
              Sign in
            </button>
            <button
              onClick={() => void loginWithKeplr()}
              className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10"
            >
              Sign in with Keplr
            </button>
          </>
        ) : (
          <button onClick={logout} className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10">
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

function StudioContent() {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const loadGameData = useCallback(async () => {
    try {
      const data = await ClientGameService.getGameData();

      setGameData(data);
      setLoadError(null);
    } catch (error) {
      console.error("Failed to load static-scene.json", error);
      setLoadError(
        error instanceof Error ? error.message : "Unknown scene load error"
      );
    } finally {
      setReady(true);
    }
  }, []);

  useEffectOnce(() => {
    createCssGradients();
    loadGameData();
  });

  if (!ready || !gameData) {
    if (ready && loadError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-sm text-white">
          Failed to load `static-scene.json`: {loadError}
        </div>
      );
    }

    return null;
  }

  return <StudioUI game={gameData} />;
}

export default function ClientStudioPage() {
  return (
    <MaestroProvider>
      <PrivyAuthProvider>
        <AuthProvider>
          <AccessProvider>
            <AvatarProvider>
              <DialogProvider>
                <SpriteProvider />
                <StudioGate />
              </DialogProvider>
            </AvatarProvider>
          </AccessProvider>
        </AuthProvider>
      </PrivyAuthProvider>
    </MaestroProvider>
  );
}
