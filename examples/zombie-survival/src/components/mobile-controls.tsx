"use client";

import { sharedControlState } from "@oncyberio/engine/input";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/hooks/use-store";
import { useTouchScreen } from "@/hooks/use-touch-screen";
import { gameStore } from "@/lib/game-store";

type StickPosition = {
  x: number;
  y: number;
};

type StickMetrics = {
  stickSize: number;
  thumbSize: number;
  outerInset: number;
  innerInset: number;
  edgeOffset: number;
};

type StickMode = "move" | "look";

const DEADZONE = 0.22;
const RESPONSE_EXPONENT = 1.75;
const CARDINAL_ASSIST_RATIO = 0.35;
const CARDINAL_ASSIST_MIN = 0.3;

function getStickMetrics(): StickMetrics {
  if (typeof window === "undefined") {
    return {
      stickSize: 104,
      thumbSize: 38,
      outerInset: 9,
      innerInset: 18,
      edgeOffset: 14,
    };
  }

  if (window.innerWidth <= 390) {
    return {
      stickSize: 88,
      thumbSize: 32,
      outerInset: 7,
      innerInset: 14,
      edgeOffset: 12,
    };
  }

  if (window.innerWidth <= 430) {
    return {
      stickSize: 96,
      thumbSize: 36,
      outerInset: 8,
      innerInset: 16,
      edgeOffset: 12,
    };
  }

  return {
    stickSize: 112,
    thumbSize: 40,
    outerInset: 9,
    innerInset: 18,
    edgeOffset: 14,
  };
}

function applyCardinalAssist(x: number, y: number): StickPosition {
  const magnitude = Math.hypot(x, y);

  if (magnitude < CARDINAL_ASSIST_MIN) {
    return { x, y };
  }

  const absX = Math.abs(x);
  const absY = Math.abs(y);

  if (absX > absY && absY <= absX * CARDINAL_ASSIST_RATIO) {
    return { x: Math.sign(x) * magnitude, y: 0 };
  }

  if (absY > absX && absX <= absY * CARDINAL_ASSIST_RATIO) {
    return { x: 0, y: Math.sign(y) * magnitude };
  }

  return { x, y };
}

function setMoveStick(x: number, y: number) {
  sharedControlState.touch.setJoystick(x, y);
}

function setLookStick(x: number, y: number) {
  sharedControlState.custom.setVector2("look", x, y);
}

function resetMobileInputs() {
  setMoveStick(0, 0);
  setLookStick(0, 0);
  sharedControlState.custom.releaseButton("jump");
  sharedControlState.custom.releaseButton("fire");
  sharedControlState.custom.releaseButton("reload");
  sharedControlState.custom.releaseButton("inspect");
}

function VirtualStick({
  mode,
  side,
}: {
  mode: StickMode;
  side: "left" | "right";
}) {
  const stickRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [metrics, setMetrics] = useState<StickMetrics>(getStickMetrics);
  const [thumbPosition, setThumbPosition] = useState<StickPosition>({ x: 0, y: 0 });

  useEffect(() => {
    const update = () => {
      setMetrics(getStickMetrics());
    };

    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      if (mode === "move") {
        setMoveStick(0, 0);
      } else {
        setLookStick(0, 0);
      }
    };
  }, [mode]);

  const updateStick = (clientX: number, clientY: number) => {
    const stick = stickRef.current;
    if (!stick) {
      return;
    }

    const rect = stick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width / 2 - metrics.thumbSize / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);
    const normalizedDistance = Math.min(distance / radius, 1);
    const adjustedDistance =
      normalizedDistance <= DEADZONE
        ? 0
        : (normalizedDistance - DEADZONE) / (1 - DEADZONE);
    const curvedDistance = adjustedDistance ** RESPONSE_EXPONENT;
    const displayDistance = normalizedDistance <= DEADZONE ? 0 : normalizedDistance;
    const directionX = distance > 0 ? dx / distance : 0;
    const directionY = distance > 0 ? dy / distance : 0;

    const displayVector =
      mode === "move"
        ? applyCardinalAssist(
            directionX * displayDistance,
            directionY * displayDistance,
          )
        : {
            x: directionX * displayDistance,
            y: directionY * displayDistance,
          };

    const outputVector =
      mode === "move"
        ? applyCardinalAssist(
            directionX * curvedDistance,
            -directionY * curvedDistance,
          )
        : {
            x: directionX * curvedDistance,
            y: -directionY * curvedDistance,
          };

    setThumbPosition({
      x: displayVector.x * radius,
      y: displayVector.y * radius,
    });

    if (mode === "move") {
      setMoveStick(outputVector.x, outputVector.y);
    } else {
      setLookStick(outputVector.x, outputVector.y);
    }
  };

  const resetStick = () => {
    pointerIdRef.current = null;
    setThumbPosition({ x: 0, y: 0 });
    if (mode === "move") {
      setMoveStick(0, 0);
    } else {
      setLookStick(0, 0);
    }
  };

  return (
    <div
      ref={stickRef}
      className="pointer-events-auto fixed rounded-full border border-white/18 bg-black/25 shadow-[0_20px_55px_rgba(0,0,0,0.34)] backdrop-blur-md"
      style={{
        width: metrics.stickSize,
        height: metrics.stickSize,
        bottom: metrics.edgeOffset,
        touchAction: "none",
        ...(side === "left"
          ? { left: metrics.edgeOffset }
          : { right: metrics.edgeOffset }),
      }}
      onPointerDown={(event) => {
        pointerIdRef.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        updateStick(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (pointerIdRef.current !== event.pointerId) {
          return;
        }
        updateStick(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        if (pointerIdRef.current !== event.pointerId) {
          return;
        }
        event.currentTarget.releasePointerCapture(event.pointerId);
        resetStick();
      }}
      onPointerCancel={(event) => {
        if (pointerIdRef.current !== event.pointerId) {
          return;
        }
        resetStick();
      }}
    >
      <div
        className="absolute rounded-full border border-dashed border-white/20"
        style={{ inset: metrics.outerInset }}
      />
      <div
        className="absolute rounded-full border border-white/12"
        style={{ inset: metrics.innerInset }}
      />
      <div
        className="absolute left-1/2 top-1/2 rounded-full border border-white/30 bg-white/18 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-sm"
        style={{
          width: metrics.thumbSize,
          height: metrics.thumbSize,
          transform: `translate(calc(-50% + ${thumbPosition.x}px), calc(-50% + ${thumbPosition.y}px))`,
        }}
      />
      <div className="absolute inset-x-0 -top-6 text-center text-[10px] font-semibold uppercase tracking-[0.26em] text-white/60">
        {mode === "move" ? "Move" : "Look"}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  action,
  className,
  hold = false,
}: {
  label: string;
  action: "jump" | "fire" | "reload" | "inspect";
  className: string;
  hold?: boolean;
}) {
  const press = () => {
    sharedControlState.custom.pressButton(action);
  };

  const release = () => {
    sharedControlState.custom.releaseButton(action);
  };

  return (
    <button
      type="button"
      className={`pointer-events-auto fixed flex select-none items-center justify-center rounded-full border text-white shadow-[0_18px_45px_rgba(0,0,0,0.32)] backdrop-blur-md ${className}`}
      style={{ touchAction: "none" }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        press();
        if (!hold) {
          requestAnimationFrame(release);
        }
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        release();
      }}
      onPointerCancel={release}
      onPointerLeave={() => {
        if (hold) {
          release();
        }
      }}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">
        {label}
      </span>
    </button>
  );
}

export function MobileControls() {
  const isTouch = useTouchScreen();
  const state = useStore(gameStore);

  useEffect(() => {
    if (!isTouch || state.gamePhase === "playing") {
      return;
    }

    resetMobileInputs();
  }, [isTouch, state.gamePhase]);

  useEffect(() => {
    return () => {
      resetMobileInputs();
    };
  }, []);

  if (!isTouch || state.gamePhase !== "playing") {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[45]">
      <VirtualStick mode="move" side="left" />
      <VirtualStick mode="look" side="right" />

      <ActionButton
        label="Fire"
        action="fire"
        hold
        className="bottom-[8.75rem] right-4 h-[4.8rem] w-[4.8rem] border-red-200/45 bg-red-500/20"
      />
      <ActionButton
        label="Jump"
        action="jump"
        className="bottom-[13.6rem] right-[5.1rem] h-14 w-14 border-sky-200/40 bg-sky-400/16"
      />
      <ActionButton
        label="Reload"
        action="reload"
        className="bottom-[13.9rem] right-4 h-12 w-12 border-amber-200/40 bg-amber-400/16"
      />
      <ActionButton
        label="Inspect"
        action="inspect"
        className="right-4 top-[5.3rem] h-10 w-[4.8rem] rounded-2xl border-white/20 bg-white/10"
      />
    </div>
  );
}
