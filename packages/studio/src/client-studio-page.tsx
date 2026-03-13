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
  const [ready, setReady] = useState(false);

  const loadGameData = useCallback(async () => {
    const data = await ClientGameService.getGameData();
    setGameData(data);
    setReady(true);
  }, []);

  useEffectOnce(() => {
    createCssGradients();
    loadGameData();
  });

  if (!ready || !gameData) {
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
