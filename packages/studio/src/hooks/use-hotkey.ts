import { useEffect } from "react";
import { useEventCallback } from "./use-event-callback";

const TagsKeyCapture = {
  INPUT: true,
  BUTTON: true,
  TEXTAREA: true,
};

export function hasTarget(
  e: KeyboardEvent,
  exclude: Record<string, boolean> = TagsKeyCapture
) {
  //
  const target = e.target as HTMLElement;

  return (
    exclude[target.tagName] ||
    (e.target as any).id === "gpt-input" ||
    target.className.includes("cm-content") ||
    target.dataset?.noundo
  );
}

export function useHotkey(
  handler: (e: KeyboardEvent) => unknown,
  exclude: Record<string, boolean> = TagsKeyCapture
) {
  //
  const callback = useEventCallback(handler, []);

  useEffect(() => {
    //
    function handleKey(e: KeyboardEvent) {
      //

      if (e.repeat || hasTarget(e, exclude)) return;

      // console.log("hot key", e);

      callback(e);
    }

    window.addEventListener("keydown", handleKey, { capture: true });

    return () =>
      window.removeEventListener("keydown", handleKey, { capture: true });
    //
  }, [exclude]);
}
