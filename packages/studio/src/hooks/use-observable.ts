import { useEffect, useSyncExternalStore, useRef } from "react";
import { WorldObservable } from "@oncyberio/engine-edit/utils/observable";

export function useObservable<T>(obs: WorldObservable<T>) {
    //
    const state = useSyncExternalStore(
        obs.subscribe,
        obs.getState,
        obs.getServerSnapshot
    );

    return state;
}
