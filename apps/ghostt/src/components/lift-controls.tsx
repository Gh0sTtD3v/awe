"use client";

import { useEffect } from "react";
import { useStore } from "@/hooks/use-store";
import { getScript } from "../lib/game-script";
import { infoStore, setLiftPanelOpen, type LiftFloor, type NearLift } from "../lib/info-store";
import { floorName } from "../../shared/lifts";

const TOGGLE_KEY = "KeyE";

function releasePointer() {
  try {
    document.exitPointerLock();
  } catch {
    // ignore
  }
}

/** A screen the player may control keeps E; lifts next to TVs are rare. */
function screenHasKey() {
  const { nearScreen } = infoStore.state;
  return !!nearScreen?.canControl;
}

function openPanel() {
  setLiftPanelOpen(true);
  releasePointer();
}

/**
 * Standing in a lift box: a prompt, and (E) a panel with that lift's floors.
 * Picking one teleports the player into that floor's box.
 */
export function LiftControls() {
  const { nearLift, liftPanelOpen } = useStore(infoStore);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.code === "Escape") return setLiftPanelOpen(false);
      if (e.code !== TOGGLE_KEY || !infoStore.state.nearLift || screenHasKey()) return;

      if (infoStore.state.liftPanelOpen) setLiftPanelOpen(false);
      else openPanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!nearLift) return null;
  if (liftPanelOpen) return <Panel lift={nearLift} />;
  return <Prompt lift={nearLift} />;
}

function Prompt({ lift }: { lift: NearLift }) {
  const others = lift.floors.length > 1;
  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-black/70 px-4 py-2 text-sm text-white/90 backdrop-blur-sm">
      <span>
        <span className="font-semibold">{lift.group}</span>
        <span className="text-white/50"> · {floorName(lift)}</span>
      </span>
      {others ? (
        <button
          onClick={openPanel}
          title="Choose a floor"
          className="flex items-center gap-2 rounded-md border border-white/20 px-2 py-0.5 text-xs hover:bg-white/10"
        >
          <kbd className="font-mono font-bold">E</kbd>
          <span className="text-white/70">Choose a floor</span>
        </button>
      ) : (
        <span className="text-xs text-white/50">No other floors yet</span>
      )}
    </div>
  );
}

function Panel({ lift }: { lift: NearLift }) {
  const ride = (floor: LiftFloor) => {
    setLiftPanelOpen(false);
    void getScript()?.rideLift(floor.id);
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col gap-3 rounded-2xl border border-white/10 bg-[rgba(18,19,27,0.92)] p-4 text-sm text-white/90 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="truncate font-semibold">{lift.group}</span>
        <button onClick={() => setLiftPanelOpen(false)} className="text-white/60 hover:text-white" aria-label="Close">
          ✕
        </button>
      </div>

      <div className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
        {lift.floors.map((floor) => {
          const here = floor.id === lift.id;
          return (
            <button
              key={floor.id}
              disabled={here || floor.locked}
              onClick={() => ride(floor)}
              title={floor.locked ? `Locked: ${floor.lockReason}` : here ? "You're here" : `Go to ${floorName(floor)}`}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left ${
                here
                  ? "bg-white text-black"
                  : floor.locked
                    ? "cursor-not-allowed text-white/35"
                    : "hover:bg-white/10"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                  here ? "border-black/30" : "border-white/25"
                }`}
              >
                {floor.floor}
              </span>
              <span className="flex-1 truncate">{floorName(floor)}</span>
              {here && <span className="text-xs text-black/60">You're here</span>}
              {floor.locked && <span aria-label="Locked">🔒</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
