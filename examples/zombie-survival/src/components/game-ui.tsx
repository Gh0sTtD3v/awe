"use client";

import { gameStore } from "../lib/game-store";
import { startGame } from "../lib/game-script";
import { useStore } from "@/hooks/use-store";
import { GAME_CONFIG } from "@/lib/game-config";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function StartScreen() {
  const state = useStore(gameStore);

  if (state.gamePhase !== "menu") return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col cursor-pointer"
      onClick={() => startGame()}
    >
      <div className="bg-black/80 py-5" />
      <div className="flex-1" />
      <div className="bg-black/80 py-5 text-center text-white text-xl">
        <em className="font-bold not-italic italic">Click</em> to start!
      </div>
    </div>
  );
}

function EndScreen() {
  const state = useStore(gameStore);

  if (state.gamePhase !== "won" && state.gamePhase !== "lost") return null;

  const isWin = state.gamePhase === "won";

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80">
      <div className="text-center text-white">
        <h1
          className={`text-[3.5rem] font-bold mb-2 ${isWin ? "text-green-400" : "text-red-400"}`}
        >
          {isWin ? "MISSION PASSED" : "GAME OVER"}
        </h1>
        <p className="text-lg text-gray-300 mb-8">
          {isWin
            ? "All zombies eliminated!"
            : state.playerHealth <= 0
              ? "You were overwhelmed by zombies"
              : "Zombies still remain"}
        </p>
        <div className="flex gap-12 justify-center mb-8">
          <div className="flex flex-col items-center">
            <span className="text-[2rem] font-bold font-mono">
              {state.zombiesKilled} / {GAME_CONFIG.maxZombies}
            </span>
            <span className="text-sm text-gray-400">Zombies Killed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HUD() {
  const state = useStore(gameStore);

  if (state.gamePhase !== "playing") return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Top center: Timer */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <div className="bg-black/60 text-white px-5 py-1.5 rounded-lg text-[1.75rem] font-bold font-mono">
          {formatTime(state.matchTimeRemaining)}
        </div>
      </div>

      {/* Top left: Zombie count */}
      <div className="absolute top-4 left-4 flex flex-col gap-1">
        <div className="bg-black/60 text-amber-400 px-3 py-1 rounded-md text-sm">
          Killed: {state.zombiesKilled} / {GAME_CONFIG.maxZombies}
        </div>
      </div>

      {/* Bottom left: Health */}
      <div className="absolute bottom-4 left-4">
        <div className="bg-black/60 text-white px-4 py-2 rounded-lg min-w-[10rem]">
          <div className="text-xs text-gray-400 mb-0.5">HP</div>
          <div className="text-2xl font-bold font-mono">
            {state.playerHealth}
          </div>
          <div className="w-full h-1 bg-gray-700 rounded-sm mt-1 overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-sm transition-[width] duration-200"
              style={{ width: `${state.playerHealth}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom right: Ammo */}
      <div className="absolute bottom-4 right-4">
        <div className="bg-black/60 text-white px-4 py-2 rounded-lg">
          <div className="text-2xl font-bold font-mono">
            {state.ammo} / {state.maxAmmo}
          </div>
          {state.isReloading && (
            <div className="text-amber-400 text-sm">Reloading...</div>
          )}
          {!state.isReloading && state.ammo === 0 && (
            <div className="text-red-400 text-sm">Press R to reload</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Crosshair() {
  const state = useStore(gameStore);

  if (state.gamePhase !== "playing") return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="relative w-6 h-6">
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/80 -translate-y-1/2" />
        <div className="absolute left-1/2 top-0 h-full w-[2px] bg-white/80 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
}

export function GameUI() {
  return (
    <>
      <StartScreen />
      <EndScreen />
      <HUD />
      <Crosshair />
    </>
  );
}
