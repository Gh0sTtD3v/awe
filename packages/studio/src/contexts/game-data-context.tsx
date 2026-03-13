import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { GameData } from "../types/game-data";
import { GameDataStore } from "../utils/game-data/game-data-store";
import { useAuth } from "./auth-context";

export interface GameDataContextProps {
  gameData: GameData;
  children: React.ReactNode;
}

export interface GameDataContextState {
  gameData: GameData;
  store: GameDataStore;
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

  return (
    <GameDataContext.Provider value={{ gameData, store }}>
      {children}
    </GameDataContext.Provider>
  );
}

export function useCurrentGameData() {
  return useContext(GameDataContext);
}
