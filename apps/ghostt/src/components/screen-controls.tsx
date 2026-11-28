"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/hooks/use-store";
import { getScript } from "../lib/game-script";
import { infoStore, setScreenPanelOpen, type NearScreen } from "../lib/info-store";
import type { ScreenAction, ScreenLoop } from "../../shared/screens";

const TOGGLE_KEY = "KeyE";

const LOOP_NEXT: Record<ScreenLoop, ScreenLoop> = { all: "one", one: "off", off: "all" };
const LOOP_LABEL: Record<ScreenLoop, string> = {
  all: "Playing the whole list",
  one: "Repeating this video",
  off: "Stopping after this video",
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function releasePointer() {
  try {
    document.exitPointerLock();
  } catch {
    // ignore
  }
}

function send(screenId: string, action: ScreenAction) {
  getScript()?.controlScreen(screenId, action);
}

/**
 * Near a video screen: what's playing, and — for players who may control
 * that screen (Control Screens, or access to its apartment's gate) — a panel
 * (E) to pick videos, play, pause, seek and set the volume for everyone.
 * Each screen has its own playlist; the panel is for the one you stand at.
 */
export function ScreenControls() {
  const { nearScreen, screenPanelOpen } = useStore(infoStore);
  const canControl = !!nearScreen?.canControl;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.code === "Escape") return setScreenPanelOpen(false);
      if (e.code !== TOGGLE_KEY || !infoStore.state.nearScreen) return;
      if (!infoStore.state.nearScreen?.canControl) return;

      const open = !infoStore.state.screenPanelOpen;
      setScreenPanelOpen(open);
      if (open) releasePointer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!nearScreen) return null;
  if (screenPanelOpen && canControl) return <Panel screen={nearScreen} />;
  return <NowPlaying screen={nearScreen} canControl={canControl} />;
}

/** What's on screen: the ad, or the video. */
function onScreen(screen: NearScreen) {
  const state = screen.state;
  if (!state || state.index < 0) return null;
  if (state.ad >= 0 && screen.ads[state.ad]) return { title: screen.ads[state.ad].title, isAd: true };
  const item = screen.items[state.index];
  return item ? { title: item.title, isAd: false } : null;
}

function NowPlaying({ screen, canControl }: { screen: NearScreen; canControl: boolean }) {
  const current = onScreen(screen);
  if (!current && !canControl) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-xl bg-black/70 px-4 py-2 text-sm text-white/90 backdrop-blur-sm">
      {current && screen.loadError && <span className="text-red-300">Can't load this video</span>}
      {current && !screen.loadError && (
        <span className="max-w-[16rem] truncate">
          <span className="text-white/50">
            {current.isAd ? "Ad" : screen.state?.playing ? "Now playing" : "Paused"} ·{" "}
          </span>
          {current.title}
        </span>
      )}
      {canControl && (
        <button
          onClick={() => {
            setScreenPanelOpen(true);
            releasePointer();
          }}
          title={`Control ${screen.label}`}
          className="rounded-md border border-white/20 px-2 py-0.5 text-xs hover:bg-white/10"
        >
          <kbd className="font-mono font-bold">E</kbd>
        </button>
      )}
    </div>
  );
}

function Panel({ screen }: { screen: NearScreen }) {
  const state = screen.state;
  const loaded = !!state && state.index >= 0 && state.index < screen.items.length;
  const playing = loaded && state.playing;
  const current = onScreen(screen);
  const isAd = !!current?.isAd;
  const [time, setTime] = useState({ time: 0, duration: 0 });
  // While dragging, and after release until the server's new position arrives.
  const [scrub, setScrub] = useState<number | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    if (!scrubbing) setScrub(null);
  }, [state, scrubbing]);

  useEffect(() => {
    const tick = () => setTime(getScript()?.screenTime(screen.id) ?? { time: 0, duration: 0 });
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [screen.id]);

  const act = (action: ScreenAction) => send(screen.id, action);
  const shown = scrub ?? time.time;
  const commitSeek = () => {
    if (!scrubbing) return;
    setScrubbing(false);
    if (scrub != null) act({ action: "seek", time: scrub });
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-2xl border border-white/10 bg-[rgba(18,19,27,0.92)] p-4 text-sm text-white/90 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="truncate font-semibold">{screen.label}</span>
        <button onClick={() => setScreenPanelOpen(false)} className="text-white/60 hover:text-white" aria-label="Close">
          ✕
        </button>
      </div>

      {screen.loadError && (
        <p className="rounded-lg bg-red-500/20 px-3 py-2 text-xs text-red-200">
          This video can't be loaded. The link may be dead, or its server doesn't allow playback from other sites.
          Upload the file in the studio instead.
        </p>
      )}

      <div className="truncate text-white/70">
        {isAd ? (
          <>
            <span className="mr-1 rounded bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-bold text-black">AD</span>
            {current!.title}
            <span className="block text-xs text-white/50">Up next: {screen.items[state!.index]?.title}</span>
          </>
        ) : loaded ? (
          screen.items[state.index].title
        ) : (
          "Nothing selected"
        )}
      </div>

      <div className="flex flex-col gap-1">
        <input
          type="range"
          min={0}
          max={time.duration || 1}
          step={0.1}
          value={Math.min(shown, time.duration || 1)}
          disabled={!loaded || !time.duration || isAd}
          title={isAd ? "Ads can't be skipped" : !time.duration ? "Waiting for the video to load" : undefined}
          onPointerDown={() => setScrubbing(true)}
          onChange={(e) => {
            setScrubbing(true);
            setScrub(parseFloat(e.target.value));
          }}
          onPointerUp={commitSeek}
          onLostPointerCapture={commitSeek}
          onKeyUp={commitSeek}
          onBlur={commitSeek}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-white/50">
          <span>{formatTime(shown)}</span>
          <span>{time.duration ? formatTime(time.duration) : "--:--"}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <IconButton label="Previous" disabled={!screen.items.length} onClick={() => act({ action: "previous" })}>
          <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
        </IconButton>
        <IconButton
          label={playing ? "Pause" : "Play"}
          disabled={!screen.items.length}
          onClick={() => act({ action: playing ? "pause" : "play" })}
          primary
        >
          {playing ? <path d="M6 5h4v14H6zm8 0h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
        </IconButton>
        <IconButton label="Next" disabled={!screen.items.length} onClick={() => act({ action: "next" })}>
          <path d="M6 18l8.5-6L6 6zM16 6h2v12h-2z" />
        </IconButton>
        <IconButton label="Stop" disabled={!loaded} onClick={() => act({ action: "stop" })}>
          <path d="M6 6h12v12H6z" />
        </IconButton>
        <IconButton
          label={LOOP_LABEL[state?.loop ?? "all"]}
          onClick={() => act({ action: "loop", loop: LOOP_NEXT[state?.loop ?? "all"] })}
          active={(state?.loop ?? "all") !== "off"}
          badge={state?.loop === "one" ? "1" : undefined}
        >
          <path d="M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z" />
        </IconButton>
      </div>

      <div className="flex items-center gap-2">
        <IconButton
          label={state?.muted ? "Unmute" : "Mute"}
          onClick={() => act({ action: "mute", muted: !state?.muted })}
          small
        >
          {state?.muted ? (
            <path d="M3 9v6h4l5 5V4L7 9zm13.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z" />
          ) : (
            <path d="M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
          )}
        </IconButton>
        <VolumeSlider
          volume={state?.volume ?? 0.75}
          onCommit={(volume) => act({ action: "volume", volume })}
        />
      </div>

      {screen.items.length > 0 ? (
        <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
          {screen.items.map((item, i) => {
            const current = loaded && state.index === i;
            return (
              <li key={`${i}-${item.url}`}>
                <button
                  onClick={() => act({ action: "select", index: i })}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                    current ? "bg-blue-600/40" : "bg-black/30 hover:bg-white/10"
                  }`}
                >
                  <span className="w-5 shrink-0 text-xs text-white/50">{i + 1}</span>
                  <span className="truncate">{item.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-white/50">This screen has no videos yet. Add them in the studio.</p>
      )}
    </div>
  );
}

/** Local while dragging, shared on release, so a drag doesn't flood the server. */
function VolumeSlider({ volume, onCommit }: { volume: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState<number | null>(null);
  const commit = () => {
    if (draft != null) onCommit(draft);
    setDraft(null);
  };

  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.05}
      value={draft ?? volume}
      onChange={(e) => setDraft(parseFloat(e.target.value))}
      onPointerUp={commit}
      onKeyUp={commit}
      aria-label="Volume"
      className="flex-1 accent-blue-500"
    />
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  primary,
  active,
  small,
  badge,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  active?: boolean;
  small?: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`relative flex items-center justify-center rounded-full disabled:opacity-30 ${
        small ? "h-8 w-8" : primary ? "h-11 w-11" : "h-9 w-9"
      } ${primary ? "bg-white text-black hover:bg-white/90" : "hover:bg-white/10"} ${
        active ? "text-blue-400" : ""
      }`}
    >
      <svg viewBox="0 0 24 24" className={small ? "h-4 w-4" : "h-5 w-5"} fill="currentColor" aria-hidden>
        {children}
      </svg>
      {badge && <span className="absolute right-0.5 top-0.5 text-[9px] font-bold">{badge}</span>}
    </button>
  );
}
