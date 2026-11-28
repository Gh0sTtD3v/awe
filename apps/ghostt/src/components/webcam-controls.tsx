"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/hooks/use-store";
import { getWebcamStream, startWebcam, stopWebcam } from "../lib/webcam-input";
import { setWebcamPreview, webcamStore } from "../lib/webcam-store";

function CamIcon({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M15 8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2.5l5 3.5V7l-5 3.5z" />
      {off && <path d="M3.3 2 2 3.3 20.7 22l1.3-1.3z" />}
    </svg>
  );
}

/** Mirrored self-view, so moving left moves left on screen. */
function Preview() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = getWebcamStream();
    return () => {
      el.srcObject = null;
    };
  }, []);
  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className="aspect-video w-full -scale-x-100 rounded-lg bg-black object-cover"
    />
  );
}

/**
 * Webcam: turn the camera on for (future) motion control. The video stays on
 * this device; nothing is sent to other players.
 */
export function WebcamControls() {
  // The camera keeps running while the UI is hidden (V); the game stops it
  // when it shuts down.
  const cam = useStore(webcamStore);

  if (cam.status !== "ready" && cam.status !== "requesting") {
    return (
      <div className="pointer-events-auto flex flex-col items-start gap-1">
        <button
          onClick={() => void startWebcam()}
          className="flex items-center gap-2 rounded-xl bg-black/70 px-4 py-2 text-sm text-white/90 backdrop-blur-sm hover:bg-black/80"
        >
          <CamIcon /> {cam.recording ? "Turn on webcam (test recording)" : "Webcam"}
        </button>
        {cam.recording && (
          <span className="rounded-lg bg-black/70 px-2 py-1 text-xs text-amber-300">Test recording paused while the webcam is off.</span>
        )}
        {cam.status === "denied" && (
          <span className="rounded-lg bg-black/70 px-2 py-1 text-xs text-red-300">Camera blocked — allow it in your browser.</span>
        )}
        {cam.status === "unavailable" && (
          <span className="rounded-lg bg-black/70 px-2 py-1 text-xs text-red-300">No camera available.</span>
        )}
      </div>
    );
  }

  return (
    <div className="pointer-events-auto flex w-64 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-2xl bg-black/70 p-3 text-sm text-white/90 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${cam.status === "ready" ? "bg-green-500/80 text-white" : "bg-white/10 text-white/70"}`}>
          <CamIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate">{cam.status === "requesting" ? "Allow the camera in your browser…" : "Webcam on"}</div>
          <div className="text-xs text-white/50">
            {cam.recording ? "Test recording · 1 frame every 30 s to the game server" : "Motion control coming soon · stays on this device"}
          </div>
        </div>
      </div>

      {cam.recording && cam.status === "ready" && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden /> Recording for testing
        </div>
      )}

      {cam.status === "ready" && cam.preview && <Preview />}

      {cam.status === "ready" && (
        <button
          onClick={() => setWebcamPreview(!cam.preview)}
          className="rounded-lg border border-white/15 px-3 py-1 text-xs hover:bg-white/10"
        >
          {cam.preview ? "Hide preview" : "Show preview"}
        </button>
      )}

      <button onClick={() => stopWebcam()} className="rounded-lg px-3 py-1 text-xs text-red-300 hover:bg-red-500/20">
        Turn off webcam
      </button>
    </div>
  );
}
