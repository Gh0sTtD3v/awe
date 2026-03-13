"use client";

import { useEffect, useRef, useState } from "react";
import { GameUI } from "@/components/game-ui";
import { GameCanvas } from "@/components/game-canvas";
import { GameScript } from "@/lib/game-script";
import { TouchJoystick } from "@/components/touch-joystick";

export function GameScene() {
  const wasInit = useRef(false);
  const isLoaded = useRef(false);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    if (wasInit.current) return;
    wasInit.current = true;

    const gameInstance = new GameScript();

    async function startGame() {
      try {
        await gameInstance.init();
        isLoaded.current = true;
        setSceneReady(true);
      } catch (err) {
        console.error("[Football] Game error:", err);
      }
    }

    startGame();

    return () => {
      if (!isLoaded.current) return;
      try {
        gameInstance.dispose();
      } catch (err) {
        console.error("Dispose Error", err);
      }
    };
  }, []);

  return (
    <div className="relative h-screen w-screen">
      <GameCanvas />
      {sceneReady && <TouchJoystick />}
      {sceneReady && <GameUI />}
    </div>
  );
}
