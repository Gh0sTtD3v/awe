// @ts-check

import React, { useState } from "react";
import { useEffectOnce } from "../hooks/use-effect-once";
import { Engine, Space } from "@oncyberio/engine";
import { EngineFacade } from "../utils/engine-api";
import { StudioCanvas } from "./studio-canvas";
import { useEditorService } from "../contexts/editor-service-context";
import { ErrorOverlay } from "../ui/error-overlay";
import { GameData } from "../types/game-data";

export function StudioScene({ game }: { game: GameData }) {
  //
  const [errorPayloads, setErrorPayloads] = useState([]);

  const { ref } = useEditorService();

  useEffectOnce(() => {
    //
    const engine = Engine.getInstance();

    let wasDisposed = false;
    let space: Space | null = null;

    const resize = () => {
      const container = document.getElementById("canvas-container");
      if (container) {
        engine.resize({ w: container.clientWidth, h: container.clientHeight });
      }
    };

    async function effect() {
      try {
        window.addEventListener("resize", resize);
        resize();

        if (wasDisposed) return;

        const result = await engine.createSpace({
          mode: "edit",
          game,
        });
        space = result.space;

        await result.reveal();

        const upgrades = space.components._flushUpgrades();

        if (
          Object.keys(upgrades?.added ?? {})?.length ||
          Object.keys(upgrades?.removed ?? {})?.length ||
          Object.keys(upgrades?.updated ?? {})?.length
        ) {
          ref.current?.applyUpgrades(upgrades);
        }

        // Notify that the editor is ready so the UI can render
        EngineFacade.notify(EngineFacade.Events.EDITOR_STATE_CHANGED, {
          state: EngineFacade.EDITOR_STATES.READY,
        });
      } catch (err) {
        console.error("space errrrrrrrrrrr", err);
      }
    }

    effect();

    engine.onError((data: any) => {
      const error = data.error;
      const isErr = error instanceof Error;
      console.error(error);

      const payload = {
        scope: data.scope,
        message: isErr ? error.message : "Unknown error",
        stack: isErr ? error.stack : "",
        script: data.script,
        data: data.data,
      };

      setErrorPayloads((prev) => [payload, ...prev]);
    });

    return () => {
      wasDisposed = true;

      window.removeEventListener("resize", resize);

      space?.destroy();

      EngineFacade.editor?.dispose();
    };
  }, "[Load Game]");

  return (
    <>
      <StudioCanvas />
      {errorPayloads.length && (
        <ErrorOverlay
          game={game}
          errors={errorPayloads}
          onClose={() => {
            setErrorPayloads([]);
          }}
        />
      )}
    </>
  );
}
