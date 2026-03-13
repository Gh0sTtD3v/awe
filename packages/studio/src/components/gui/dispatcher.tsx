import type { Component3D, Space } from "@oncyberio/engine";
import React from "react";

export interface RunResult {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  info: any;
}

export interface ActionDispatchPayload {
  origin: "action";
  run: () => Promise<RunResult> | null;
}

export interface InputDispatchPayload {
  origin: "input";
  run: () => Promise<RunResult> | null;
  isProgress?: boolean;
  source?: any;
  changes?: any;
  isApply?: boolean;
}

export type DispatchPayload = ActionDispatchPayload | InputDispatchPayload;

export interface DispatcherContextType {
  component: Component3D;
  space: Space;
  componentId?: (id: string) => any;
  dispatch: (payload: DispatchPayload) => unknown | Promise<unknown>;
  supportsUndo: boolean;
}

export interface DispatcherProviderProps {
  children: React.ReactNode;
  dispatch: (payload: DispatchPayload) => unknown | Promise<unknown>;
  supportsUndo: boolean;
  component: Component3D;
  space: Space;
}

const DispatcherContext = React.createContext<DispatcherContextType>(null);

export function DispatcherProvider({
  children,
  dispatch,
  supportsUndo,
  component,
  space,
}) {
  //
  // const [dummy, setDummy] = React.useState(0);

  // const dispatch = (payload) => {
  //
  // const before = window.$state.model.data.meshes[0].material.opacity;
  // dispatcher(payload);
  //const after = window.$state.model.data.meshes[0].material.opacity;
  // console.log("opacity changed from", before, "to", after, {
  //     isProgress,
  // });

  // if (!isProgress) {
  //
  // setDummy((prev) => prev + 1);
  // }
  // };

  const value = React.useMemo(() => {
    //
    return {
      space,
      component,
      dispatch,
      supportsUndo,
    };
  }, [supportsUndo, component, dispatch]);

  return (
    <DispatcherContext.Provider value={value}>
      {children}
    </DispatcherContext.Provider>
  );
}

export function useDispatcher() {
  //
  return React.useContext(DispatcherContext);
}
