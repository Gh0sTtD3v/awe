import { EngineFacade } from "../utils/engine-api";
import { useObservable } from "./use-observable";
import { useEventCallback } from "./use-event-callback";
import { TransformModes } from "@oncyberio/engine-edit/types";

export function useWorldTransformerState() {
  //
  const state = useObservable(EngineFacade.editor.state.transform);

  const toggleMode = useEventCallback((mode: Partial<TransformModes>) => {
    EngineFacade.editor.transformer.enabledModes = {
      ...EngineFacade.editor.transformer.enabledModes,
      ...mode,
    };
  }, []);

  return {
    ...state,
    toggleMode,
  };
}
