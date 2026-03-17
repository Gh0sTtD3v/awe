import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { getCurrentSpace } from "@oncyberio/engine/internal";
import { applyGameDataToSpace } from "@oncyberio/engine/space/hot-reload";
import { GameData } from "../types/game-data";
import { GameDataStore } from "../utils/game-data/game-data-store";
import { ClientGameService } from "../services/client-game-service";
import { deepEqual } from "../utils/js";
import { useAuth } from "./auth-context";

export interface GameDataContextProps {
  gameData: GameData;
  children: React.ReactNode;
}

export interface GameDataContextState {
  gameData: GameData;
  store: GameDataStore;
}

const sceneEventsUrl = "/api/studio/scene-events";

function parseSceneRevision(event: MessageEvent) {
  try {
    const payload = JSON.parse(event.data);

    return typeof payload?.mtimeMs === "number" ? payload.mtimeMs : null;
  } catch {
    return null;
  }
}

export const GameDataContext = createContext<GameDataContextState>(null);

export function GameDataProvider({
  gameData: _seed,
  children,
}: GameDataContextProps) {
  //
  const { user, isAnonymous } = useAuth();

  const store = useMemo(() => {
    //
    //console.log("ExhibitProvider: exhibitStore", exhibitId, currentExhibit);
    return new GameDataStore({
      gameData: _seed,
      userId: user.uid,
      isAnonymous,
    });
    //
  }, [_seed.id, user.uid, isAnonymous]);

  const gameData = useSyncExternalStore(
    store.subscribe,
    store.getState,
    () => _seed
  );

  const lastRevisionRef = useRef<number | null>(null);
  const isSyncingRef = useRef(false);
  const lastSyncErrorRef = useRef<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let hasServerPush = false;
    let hasLoggedSceneEventsError = false;
    let sceneEvents: EventSource | null = null;

    const logSceneEventsError = (message: string, error?: unknown) => {
      if (disposed || hasLoggedSceneEventsError) {
        return;
      }

      hasLoggedSceneEventsError = true;

      if (error == null) {
        console.error(message);
        return;
      }

      console.error(message, error);
    };

    const syncRemoteGameData = async (mtimeHint?: number | null) => {
      if (disposed || isSyncingRef.current) {
        return;
      }

      isSyncingRef.current = true;

      try {
        const { mtimeMs } =
          typeof mtimeHint === "number"
            ? { mtimeMs: mtimeHint }
            : await ClientGameService.getGameRevision();

        if (disposed) {
          return;
        }

        if (
          lastRevisionRef.current != null &&
          mtimeMs === lastRevisionRef.current
        ) {
          lastSyncErrorRef.current = null;
          return;
        }

        const prevGameData = store.gameData;
        const nextGameData = await ClientGameService.getGameData();

        if (disposed) {
          return;
        }

        if (store.hasPendingChanges()) {
          return;
        }

        const componentsChanged = !deepEqual(
          prevGameData.components,
          nextGameData.components
        );

        if (componentsChanged) {
          applyGameDataToSpace(getCurrentSpace(), prevGameData, nextGameData);
        }

        const syncResult = store.syncRemoteGameData(nextGameData);

        if (syncResult.skipped) {
          return;
        }

        lastRevisionRef.current = mtimeMs;
        lastSyncErrorRef.current = null;

        if (!syncResult.changed) {
          return;
        }
      } catch (error) {
        if (disposed) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Unknown sync error";

        if (message !== lastSyncErrorRef.current) {
          console.error("Failed to sync static-scene.json into studio", error);
          lastSyncErrorRef.current = message;
        }
      } finally {
        isSyncingRef.current = false;
      }
    };

    if (typeof EventSource !== "function") {
      logSceneEventsError(
        "EventSource is not available; realtime static-scene sync is disabled."
      );
    } else {
      sceneEvents = new EventSource(sceneEventsUrl);

      const onServerPush = (event: MessageEvent) => {
        hasServerPush = true;
        syncRemoteGameData(parseSceneRevision(event));
      };

      sceneEvents.addEventListener("ready", onServerPush);
      sceneEvents.addEventListener("scene-change", onServerPush);
      sceneEvents.addEventListener("ping", () => {
        hasServerPush = true;
      });

      sceneEvents.onerror = (error) => {
        if (disposed || hasServerPush) {
          return;
        }

        logSceneEventsError(
          `Failed to connect to ${sceneEventsUrl}; realtime static-scene sync is disabled.`,
          error
        );
      };
    }

    return () => {
      disposed = true;

      sceneEvents?.close();
    };
  }, [store]);

  return (
    <GameDataContext.Provider value={{ gameData, store }}>
      {children}
    </GameDataContext.Provider>
  );
}

export function useCurrentGameData() {
  return useContext(GameDataContext);
}
