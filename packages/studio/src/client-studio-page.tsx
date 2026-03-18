"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useEffectOnce } from "./hooks/use-effect-once";
import { GameData } from "./types/game-data";
import { AuthProvider } from "./contexts/auth-context";
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
      <AuthProvider>
        <AvatarProvider>
          <DialogProvider>
            <SpriteProvider />
            <StudioContent />
          </DialogProvider>
        </AvatarProvider>
      </AuthProvider>
    </MaestroProvider>
  );
}
