"use client";

import { gameStore } from "../lib/game-store";
import { startGame } from "../lib/game-script";
import { useStore } from "@/hooks/use-store";
import { InfoCard } from "./info-card";
import { ChunkLoading } from "./chunk-loading";
import { AccountPanel } from "./account-panel";
import { GateNotice } from "./gate-notice";
import { ModMessage, RemovedOverlay } from "./moderation-notice";
import { ScreenControls } from "./screen-controls";
import { LiftControls } from "./lift-controls";
import { VoiceControls } from "./voice-controls";
import { ChatPanel } from "./chat-panel";
import { RolePreviewBanner } from "./role-preview-banner";

function StartScreen() {
  const state = useStore(gameStore);

  if (state.started) return null;

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

function PauseIndicator() {
  const state = useStore(gameStore);

  if (!state.paused) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 pointer-events-none">
      <div className="text-white text-4xl font-bold">PAUSED</div>
    </div>
  );
}

function InfoOverlay() {
  const state = useStore(gameStore);
  // Only show the info UI once the game has started.
  if (!state.started) return null;
  return <InfoCard />;
}

function ScreenOverlay() {
  const state = useStore(gameStore);
  if (!state.started) return null;
  return (
    <>
      <ScreenControls />
      <LiftControls />
      {/* Bottom-left column: chat sits on top of the voice controls, whatever their size. */}
      <div className="pointer-events-none fixed bottom-6 left-6 z-40 flex flex-col items-start gap-2">
        <ChatPanel />
        <VoiceControls />
      </div>
    </>
  );
}

function ChunkLoadingOverlay() {
  const state = useStore(gameStore);
  // The start screen covers the initial load already.
  if (!state.started) return null;
  return <ChunkLoading />;
}

export function GameUI() {
  return (
    <>
      <StartScreen />
      <PauseIndicator />
      <InfoOverlay />
      <ChunkLoadingOverlay />
      <ScreenOverlay />
      <AccountPanel />
      <RolePreviewBanner />
      <GateNotice />
      <ModMessage />
      <RemovedOverlay />
    </>
  );
}
