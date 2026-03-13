"use client";

import { useEffect, useState } from "react";
import { gameStore } from "@/lib/game-store";
import { startGame, restartMatch, kickoff } from "@/lib/game-script";
import { useStore } from "@/hooks/use-store";

function StartScreen() {
  const state = useStore(gameStore);

  useEffect(() => {
    if (state.started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") startGame();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.started]);

  if (state.started) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col cursor-pointer"
      onClick={() => startGame()}
    >
      <div className="bg-black/80 py-5" />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-white text-5xl font-bold mb-4">Football Demo</h1>
          <p className="text-white/60 text-lg mb-2">1v1 — First to 3 wins</p>
          <p className="text-white/40 text-sm">WASD to move, E to kick</p>
        </div>
      </div>
      <div className="bg-black/80 py-5 text-center text-white text-xl">
        <em className="font-bold not-italic">Click</em> or press <em className="font-bold not-italic">Enter</em> to start!
      </div>
    </div>
  );
}

function ScoreBoard() {
  const state = useStore(gameStore);

  if (!state.started || state.gameOver) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="bg-black/70 rounded-lg px-8 py-3 text-center">
        <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Score</div>
        <div className="text-white text-3xl font-bold tabular-nums">
          <span className="text-blue-400">You</span>
          {" "}
          {state.playerScore} - {state.aiScore}
          {" "}
          <span className="text-red-400">AI</span>
        </div>
      </div>
    </div>
  );
}

function KickHint() {
  const state = useStore(gameStore);

  if (!state.started || state.gameOver) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="bg-black/50 rounded px-4 py-2 text-white/50 text-sm">
        Press <span className="text-white font-bold">E</span> to kick
      </div>
    </div>
  );
}

function GoalAnimation() {
  const state = useStore(gameStore);
  const [phase, setPhase] = useState<
    "impact" | "enter" | "hold" | "exit" | null
  >(null);

  useEffect(() => {
    if (!state.goalScored) {
      setPhase(null);
      return;
    }
    setPhase("impact");
    const enterTimer = setTimeout(() => setPhase("enter"), 120);
    const holdTimer = setTimeout(() => setPhase("hold"), 500);
    const exitTimer = setTimeout(() => setPhase("exit"), 1800);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
    };
  }, [state.goalScored]);

  if (!state.goalScored || !phase) return null;

  const isPlayer = state.goalScored === "player";
  const color = isPlayer ? "#4ade80" : "#f87171";
  const shaking = phase === "impact" || phase === "enter";

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
      style={{
        animation: shaking ? "goal-shake 80ms linear 4" : "none",
      }}
    >
      <style>{`
        @keyframes goal-shake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-6px, 4px); }
          50% { transform: translate(5px, -3px); }
          75% { transform: translate(-3px, -5px); }
        }
        @keyframes goal-flash {
          0% { opacity: 0.9; }
          100% { opacity: 0; }
        }
        @keyframes goal-burst {
          0% { transform: scale(0); opacity: 0.7; }
          100% { transform: scale(4); opacity: 0; }
        }
      `}</style>

      {/* White impact flash */}
      {(phase === "impact" || phase === "enter") && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle, ${color}, white 30%, transparent 70%)`,
            animation: "goal-flash 350ms ease-out forwards",
          }}
        />
      )}

      {/* Radial burst ring */}
      {(phase === "impact" || phase === "enter") && (
        <div
          className="absolute"
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            border: `4px solid ${color}`,
            animation: "goal-burst 500ms ease-out forwards",
          }}
        />
      )}

      {/* Darkened backdrop */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-400"
        style={{
          opacity: phase === "impact" ? 0.7 : phase === "exit" ? 0 : 0.5,
        }}
      />

      {/* Main GOAL text */}
      <div
        className="relative flex flex-col items-center transition-all"
        style={{
          transform:
            phase === "impact"
              ? "scale(5) rotate(-8deg)"
              : phase === "enter"
                ? "scale(1.15) rotate(2deg)"
                : phase === "exit"
                  ? "scale(0.8) translateY(-40px)"
                  : "scale(1) rotate(0deg)",
          opacity: phase === "exit" ? 0 : 1,
          transitionDuration:
            phase === "impact"
              ? "0ms"
              : phase === "enter"
                ? "300ms"
                : phase === "hold"
                  ? "300ms"
                  : "600ms",
          transitionTimingFunction:
            phase === "enter"
              ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
              : phase === "hold"
                ? "cubic-bezier(0.25, 1, 0.5, 1)"
                : "ease-in",
        }}
      >
        <div
          className="text-9xl font-black tracking-widest"
          style={{
            color,
            textShadow: `0 0 40px ${color}, 0 0 80px ${color}, 0 0 120px ${color}, 0 4px 0 rgba(0,0,0,0.3)`,
            letterSpacing: "0.15em",
          }}
        >
          GOAL!
        </div>
        <div
          className="text-2xl font-bold text-white/80 mt-2 uppercase tracking-[0.3em] transition-opacity duration-300"
          style={{
            opacity: phase === "hold" ? 1 : 0,
            transitionDelay: phase === "hold" ? "100ms" : "0ms",
          }}
        >
          {isPlayer ? "You scored!" : "AI scored!"}
        </div>
        <div
          className="text-5xl font-bold text-white mt-4 tabular-nums transition-opacity duration-300"
          style={{
            opacity: phase === "hold" ? 1 : 0,
            transitionDelay: phase === "hold" ? "200ms" : "0ms",
          }}
        >
          {state.playerScore} - {state.aiScore}
        </div>
      </div>

      {/* Decorative lines */}
      <div
        className="absolute left-0 right-0 h-1 top-1/2 -translate-y-16 transition-all duration-500"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: phase === "hold" ? 0.6 : 0,
          transform: `translateY(-4rem) scaleX(${phase === "hold" ? 1 : 0})`,
        }}
      />
      <div
        className="absolute left-0 right-0 h-1 top-1/2 translate-y-16 transition-all duration-500"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: phase === "hold" ? 0.6 : 0,
          transform: `translateY(4rem) scaleX(${phase === "hold" ? 1 : 0})`,
        }}
      />
    </div>
  );
}

function GameOverScreen() {
  const state = useStore(gameStore);

  useEffect(() => {
    if (!state.gameOver) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") restartMatch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.gameOver]);

  if (!state.gameOver) return null;

  const isWin = state.gameOver === "win";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="text-center">
        <h2 className={`text-6xl font-bold mb-4 ${isWin ? "text-green-400" : "text-red-400"}`}>
          {isWin ? "You Win!" : "You Lose!"}
        </h2>
        <p className="text-white text-2xl mb-8 tabular-nums">
          {state.playerScore} - {state.aiScore}
        </p>
        <button
          className="bg-white text-black font-bold px-8 py-3 rounded-lg text-lg cursor-pointer hover:bg-white/90 transition-colors"
          onClick={() => restartMatch()}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}

function KickoffPrompt() {
  const state = useStore(gameStore);

  useEffect(() => {
    if (!state.waitingForKickoff) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") kickoff();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.waitingForKickoff]);

  if (!state.waitingForKickoff) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
      onClick={() => kickoff()}
    >
      <div className="bg-black/60 rounded-lg px-8 py-4 text-center">
        <p className="text-white text-xl">
          <em className="font-bold not-italic">Click</em> or press{" "}
          <em className="font-bold not-italic">Enter</em> to kick off!
        </p>
      </div>
    </div>
  );
}

export function GameUI() {
  return (
    <>
      <StartScreen />
      <ScoreBoard />
      <KickHint />
      <GoalAnimation />
      <KickoffPrompt />
      <GameOverScreen />
    </>
  );
}
