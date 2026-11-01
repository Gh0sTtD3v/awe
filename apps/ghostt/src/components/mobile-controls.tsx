"use client";

import { sharedControlState } from "@oncyberio/engine/input";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/hooks/use-store";
import { useTouchScreen } from "@/hooks/use-touch-screen";
import { gameStore } from "../lib/game-store";
import { infoStore } from "../lib/info-store";
import { getScript } from "../lib/game-script";

// Ported from examples/zombie-survival (move stick only; look is a drag on the canvas).

const STICK_SIZE = 112;
const THUMB_SIZE = 40;
const EDGE_OFFSET = 16;
const DEADZONE = 0.22;
const RESPONSE_EXPONENT = 1.75;

/** Room the stick takes at the bottom left, so other UI can sit above it. */
export const MOBILE_STICK_CLEARANCE = STICK_SIZE + EDGE_OFFSET * 2;

type HeldButton = "jump" | "down";

function resetMobileInputs() {
  sharedControlState.touch.setJoystick(0, 0);
  sharedControlState.custom.releaseButton("jump");
  sharedControlState.custom.releaseButton("down");
}

function MoveStick() {
  const stickRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });

  useEffect(() => () => sharedControlState.touch.setJoystick(0, 0), []);

  const update = (clientX: number, clientY: number) => {
    const stick = stickRef.current;
    if (!stick) return;

    const rect = stick.getBoundingClientRect();
    const radius = rect.width / 2 - THUMB_SIZE / 2;
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    const normalized = Math.min(distance / radius, 1);
    const dirX = distance > 0 ? dx / distance : 0;
    const dirY = distance > 0 ? dy / distance : 0;

    const shown = normalized <= DEADZONE ? 0 : normalized;
    const output = normalized <= DEADZONE ? 0 : ((normalized - DEADZONE) / (1 - DEADZONE)) ** RESPONSE_EXPONENT;

    setThumb({ x: dirX * shown * radius, y: dirY * shown * radius });
    sharedControlState.touch.setJoystick(dirX * output, -dirY * output);
  };

  const reset = () => {
    pointerIdRef.current = null;
    setThumb({ x: 0, y: 0 });
    sharedControlState.touch.setJoystick(0, 0);
  };

  return (
    <div
      ref={stickRef}
      className="pointer-events-auto fixed rounded-full border border-white/20 bg-black/25 backdrop-blur-md"
      style={{ width: STICK_SIZE, height: STICK_SIZE, left: EDGE_OFFSET, bottom: EDGE_OFFSET, touchAction: "none" }}
      onPointerDown={(e) => {
        pointerIdRef.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pointerIdRef.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (pointerIdRef.current !== e.pointerId) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        reset();
      }}
      onPointerCancel={(e) => {
        if (pointerIdRef.current === e.pointerId) reset();
      }}
    >
      <div
        className="absolute left-1/2 top-1/2 rounded-full border border-white/30 bg-white/20"
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          transform: `translate(calc(-50% + ${thumb.x}px), calc(-50% + ${thumb.y}px))`,
        }}
      />
    </div>
  );
}

/** Held while the finger is down: jump / rise, or descend. */
function HoldButton({ action, label, className }: { action: HeldButton; label: string; className: string }) {
  const release = () => sharedControlState.custom.releaseButton(action);
  return (
    <button
      type="button"
      className={`pointer-events-auto flex select-none items-center justify-center rounded-full border border-white/25 bg-white/15 text-xs font-semibold text-white backdrop-blur-md active:bg-white/30 ${className}`}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        sharedControlState.custom.pressButton(action);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      {label}
    </button>
  );
}

function ToggleButton({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={`pointer-events-auto h-9 select-none rounded-full border px-4 text-xs font-semibold backdrop-blur-md ${
        on ? "border-white bg-white text-black" : "border-white/25 bg-black/30 text-white"
      }`}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        e.preventDefault();
        onToggle();
      }}
    >
      {label}
    </button>
  );
}

/** On-screen controls for touch devices: move stick, jump / up / down, and the fly and fast toggles. */
export function MobileControls() {
  const isTouch = useTouchScreen();
  const { started, paused, flying, fast } = useStore(gameStore);
  const { self } = useStore(infoStore);
  const mayFly = (self?.permissions ?? []).includes("fly");
  const visible = isTouch && started && !paused;

  useEffect(() => {
    if (!visible) resetMobileInputs();
  }, [visible]);
  useEffect(() => () => resetMobileInputs(), []);

  // Leaving fly mode while "down" is held would leave it stuck.
  useEffect(() => {
    if (!flying) sharedControlState.custom.releaseButton("down");
  }, [flying]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[45]">
      <MoveStick />

      {/* Bottom right, above the lift / screen prompts. */}
      <div className="fixed bottom-24 right-4 flex flex-col items-end gap-3">
        <div className="flex gap-2">
          {mayFly && <ToggleButton label="Fly" on={flying} onToggle={() => getScript()?.toggleFly()} />}
          <ToggleButton label="Fast" on={fast} onToggle={() => getScript()?.toggleFast()} />
        </div>
        <div className="flex items-end gap-3">
          {flying && <HoldButton action="down" label="Down" className="h-14 w-14" />}
          <HoldButton action="jump" label={flying ? "Up" : "Jump"} className="h-16 w-16" />
        </div>
      </div>
    </div>
  );
}
