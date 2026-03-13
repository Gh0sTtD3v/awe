import { EngineFacade } from "../utils/engine-api";
import { useObservable } from "./use-observable";
import { useEffect } from "react";

export function useFocusSelection() {
    //
    const allSelected = useObservable(EngineFacade.editor.state.selection);

    const singleSelected = allSelected.length === 1 ? allSelected[0] : null;

    useEffect(() => {
        //
        if (singleSelected == null) return;

        EngineFacade.editor.navigation.focusOn(singleSelected);

        //
    }, [singleSelected]);
}
