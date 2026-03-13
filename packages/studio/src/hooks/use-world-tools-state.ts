import { EngineFacade } from "../utils/engine-api";
import { useObservable } from "./use-observable";

export function useWorldToolsState() {
    //
    const state = useObservable(EngineFacade.editor.state.tools);

    return state;
}
