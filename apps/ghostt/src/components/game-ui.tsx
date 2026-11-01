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
import { MobileControls, MOBILE_STICK_CLEARANCE } from "./mobile-controls";
import { useTouchScreen } from "@/hooks/use-touch-screen";

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

/** "FLY MODE ON" etc., styled like the studio's notice. */
function ModeNotice() {
  const { modeNotice } = useStore(gameStore);
  if (!modeNotice) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-1/4 z-40 -translate-x-1/2 text-lg font-bold text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.9)]">
      {modeNotice}
    </div>
  );
}

function ScreenOverlay() {
  const state = useStore(gameStore);
  const isTouch = useTouchScreen();
  if (!state.started) return null;
  return (
    <>
      <ScreenControls />
      <LiftControls />
      <MobileControls />
      <ModeNotice />
      {/* Bottom-left column: chat sits on top of the voice controls, whatever their size.
          On touch screens it moves up to make room for the move stick. */}
      <div
        className="pointer-events-none fixed bottom-6 left-6 z-40 flex flex-col items-start gap-2"
        style={isTouch ? { bottom: MOBILE_STICK_CLEARANCE } : undefined}
      >
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
