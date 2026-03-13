import { useEffectOnce } from "./use-effect-once";
import { useEffect } from "react";
import { EngineFacade } from "../utils/engine-api";

export function useWorldEvent(event, listen) {
  useEffectOnce(() => {
    const dispose = EngineFacade.on(event, listen);

    return dispose;
  });
}
