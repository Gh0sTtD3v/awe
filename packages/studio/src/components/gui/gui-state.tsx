import type { Store, UIEditorState } from "@oncyberio/engine-edit/types";
import React, { useSyncExternalStore } from "react";

interface GUIStateProps {
  store: Store<UIEditorState>;
  children: React.ReactNode;
}

interface GUIStateContextType {
  state: UIEditorState;
  setState: (state: UIEditorState) => void;
}

const GUIStateContext = React.createContext<GUIStateContextType>(null);

export function GUIStateProvider({ children, store }: GUIStateProps) {
  //
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState
  );

  const value = React.useMemo(() => {
    //

    const setState = (state: UIEditorState) => {
      //
      store.update(state);
    };

    return {
      state,
      setState,
    };
  }, [state]);

  return (
    <GUIStateContext.Provider value={value}>
      {children}
    </GUIStateContext.Provider>
  );
}

export function useGUIState() {
  //
  return React.useContext(GUIStateContext);
}
