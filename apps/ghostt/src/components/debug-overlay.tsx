"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/hooks/use-store";
import { infoStore } from "../lib/info-store";
import { getScript, type DebugInfo } from "../lib/game-script";

// Minecraft-style F3 screen: where you are, which way you face, which plot
// you're in, how fast you move, and how the game is running.

const STORAGE_KEY = "debug-overlay-open";
const SAMPLE_MS = 100;
const FPS_MS = 500;
/** How much each new speed sample counts; lower is smoother. */
const SPEED_SMOOTHING = 0.3;

const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];

function compass(yaw: number): string {
  return COMPASS[Math.round(yaw / 45) % 8];
}

function xyz(p: { x: number; y: number; z: number }): string {
  return `${p.x.toFixed(2)} / ${p.y.toFixed(2)} / ${p.z.toFixed(2)}`;
}

function onOff(v: boolean): string {
  return v ? "on" : "off";
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

function readOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeOpen(open: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  } catch {
    // ignore
  }
}

interface Sample {
  info: DebugInfo | null;
  speed: number;
  fps: number;
}

export function DebugOverlay() {
  const [open, setOpen] = useState(false);
  const [sample, setSample] = useState<Sample>({ info: null, speed: 0, fps: 0 });
  const { chunkKey, chunkInfo, players } = useStore(infoStore);

  useEffect(() => setOpen(readOpen()), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "F3") return;
      // F3 is "find next" in browsers.
      e.preventDefault();
      if (e.repeat || isTyping(e.target)) return;
      setOpen((v) => {
        writeOpen(!v);
        return !v;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;

    let raf = 0;
    let frames = 0;
    let fps = 0;
    let fpsSince = performance.now();
    let sampledAt = 0;
    let last: { x: number; y: number; z: number; t: number } | null = null;
    let speed = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      frames++;
      if (now - fpsSince >= FPS_MS) {
        fps = Math.round((frames * 1000) / (now - fpsSince));
        frames = 0;
        fpsSince = now;
      }
      if (now - sampledAt < SAMPLE_MS) return;
      sampledAt = now;

      const info = getScript()?.getDebugInfo() ?? null;
      if (info) {
        const p = info.position;
        if (last) {
          const dt = (now - last.t) / 1000;
          const moved = Math.hypot(p.x - last.x, p.y - last.y, p.z - last.z);
          const current = dt > 0 ? moved / dt : 0;
          speed += (current - speed) * SPEED_SMOOTHING;
          if (speed < 0.05) speed = 0;
        }
        last = { x: p.x, y: p.y, z: p.z, t: now };
      }
      setSample({ info, speed, fps });
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  if (!open) return null;

  const { info, speed, fps } = sample;
  const plot = [
    chunkKey ?? "—",
    chunkInfo?.slug ? String(chunkInfo.slug) : null,
    chunkInfo?.title ? `"${chunkInfo.title}"` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="pointer-events-none fixed left-4 top-4 z-40 rounded-md bg-black/45 px-3 py-2 font-mono text-[13px] leading-5 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
      {info ? (
        <>
          <div>XYZ: {xyz(info.position)}</div>
          {info.cameraPosition && <div>Camera XYZ: {xyz(info.cameraPosition)}</div>}
          <div>
            Facing: {compass(info.yaw)} (yaw {info.yaw.toFixed(1)}°, pitch {info.pitch.toFixed(1)}°)
          </div>
          <div>Plot: {plot}</div>
          <div>
            Speed: {speed.toFixed(1)} m/s{"   "}Fly: {onOff(info.flying)}{"  "}Fast: {onOff(info.fast)}
            {"  "}Cinematic: {onOff(info.cinematic)}
          </div>
        </>
      ) : (
        <div>Waiting for the player…</div>
      )}
      <div>
        FPS: {fps}{"   "}Players: {players.length}
      </div>
    </div>
  );
}
