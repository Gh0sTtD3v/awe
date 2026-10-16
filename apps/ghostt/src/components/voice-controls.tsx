"use client";

import { useState } from "react";
import { useStore } from "@/hooks/use-store";
import { getScript } from "../lib/game-script";
import { infoStore } from "../lib/info-store";
import { setVoiceMode, voiceStore } from "../lib/voice-store";

function MicIcon({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1a7 7 0 0 0 6-6.9z" />
      {off && <path d="M3.3 2 2 3.3 20.7 22l1.3-1.3z" />}
    </svg>
  );
}

/**
 * Voice chat: join (asks for the microphone), push-to-talk on T or an open
 * mic, a level meter as sound check, and leave. Players without Speak can
 * join to listen.
 */
export function VoiceControls() {
  const voice = useStore(voiceStore);
  const { self } = useStore(infoStore);
  const [open, setOpen] = useState(false);
  const canSpeak = !!self?.permissions.includes("speak");
  const connected = Object.values(voice.peers).filter((s) => s === "connected").length;
  const failed = Object.values(voice.peers).filter((s) => s === "failed").length;

  if (!voice.joined) {
    return (
      <button
        onClick={() => void getScript()?.joinVoice()}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-xl bg-black/70 px-4 py-2 text-sm text-white/90 backdrop-blur-sm hover:bg-black/80"
      >
        <MicIcon /> {canSpeak ? "Join voice" : "Listen to voice"}
      </button>
    );
  }

  const status =
    voice.mic === "requesting"
      ? "Allow the microphone in your browser…"
      : voice.mic === "denied"
        ? "Microphone blocked — you can still listen."
        : voice.mic === "listen-only"
          ? "Listening only — your role can't speak."
          : voice.mode === "ptt"
            ? voice.transmitting
              ? "Talking…"
              : "Hold T to talk"
            : voice.selfMuted
              ? "Muted"
              : "Mic on";

  return (
    <div className="fixed bottom-6 left-6 z-40 flex w-64 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-2xl bg-black/70 p-3 text-sm text-white/90 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            voice.transmitting ? "bg-green-500/80 text-white" : "bg-white/10 text-white/70"
          }`}
        >
          <MicIcon off={voice.mic !== "ready" || (voice.mode === "open" && voice.selfMuted)} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate">{status}</div>
          <div className="text-xs text-white/50">
            {connected === 0 ? "Nobody nearby" : `${connected} nearby`}
            {failed > 0 && ` · ${failed} can't connect`}
          </div>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="rounded px-1 text-white/60 hover:text-white" aria-label="Voice settings">
          ⚙
        </button>
      </div>

      {voice.mic === "ready" && (
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10" title="Microphone level">
          <div
            className={`h-full transition-[width] duration-100 ${voice.transmitting ? "bg-green-400" : "bg-white/40"}`}
            style={{ width: `${voice.level * 100}%` }}
          />
        </div>
      )}

      {voice.mic === "ready" && voice.mode === "open" && (
        <button
          onClick={() => voiceStore.update({ selfMuted: !voice.selfMuted })}
          className="rounded-lg border border-white/15 px-3 py-1 text-xs hover:bg-white/10"
        >
          {voice.selfMuted ? "Unmute" : "Mute"}
        </button>
      )}

      {open && (
        <div className="flex flex-col gap-2 border-t border-white/10 pt-2 text-xs">
          <div className="flex gap-1">
            {(["ptt", "open"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setVoiceMode(mode)}
                className={`flex-1 rounded-md px-2 py-1 ${voice.mode === mode ? "bg-white/20" : "hover:bg-white/10"}`}
              >
                {mode === "ptt" ? "Push to talk (T)" : "Open mic"}
              </button>
            ))}
          </div>
          <p className="text-white/50">Use headphones to stop others hearing themselves through your speakers.</p>
        </div>
      )}

      <button
        onClick={() => {
          getScript()?.leaveVoice();
          setOpen(false);
        }}
        className="rounded-lg px-3 py-1 text-xs text-red-300 hover:bg-red-500/20"
      >
        Leave voice
      </button>
    </div>
  );
}
