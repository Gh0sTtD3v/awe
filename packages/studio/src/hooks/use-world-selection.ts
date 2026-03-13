import { EngineFacade } from "../utils/engine-api";
import { useObservable } from "./use-observable";

export function useWorldSelection() {
    //
    const allSelected = useObservable(EngineFacade.editor.state.selection);

    const singleSelected = allSelected.length === 1 ? allSelected[0] : null;

    const setSelectedItems = (items: string[]) => {
        //
        throw new Error("Not implemented");
    };

    return { allSelected, singleSelected, setSelectedItems };
}
