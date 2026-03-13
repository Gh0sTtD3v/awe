import { IS_MAC } from "../utils/device";
import { useEffect } from "react";
import { WorldEditorService } from "../services/editor";

//

function isUndoTarget(e: KeyboardEvent) {
  //
  const target = e.target as HTMLElement;

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.id === "gpt-input" ||
    target.className.includes("cm-content") ||
    target.dataset?.noundo
  );
}

const TYPES = {
  UNDO: "undo",
  REDO: "redo",
};

function getCmdType(e: KeyboardEvent) {
  if (IS_MAC) {
    if (e.metaKey && (e.key === "z" || e.key === "Z")) {
      if (e.shiftKey) {
        return TYPES.REDO;
      }

      return TYPES.UNDO;
    }
  } else {
    if (e.ctrlKey && (e.key === "z" || e.key === "Z")) {
      return TYPES.UNDO;
    } else if (e.ctrlKey && (e.key === "y" || e.key === "Y")) {
      return TYPES.REDO;
    }
  }

  return null;
}

export function useUndoManager(editor: WorldEditorService) {
  //

  useEffect(() => {
    if (editor == null) return;

    function handleKey(e: KeyboardEvent) {
      //
      if (e.repeat) return;

      const cmd = getCmdType(e);

      if (cmd == null || isUndoTarget(e)) return;

      e.stopPropagation();
      e.preventDefault();

      if (cmd === TYPES.UNDO) {
        editor.undoManager.undo();
      } else if (cmd === TYPES.REDO) {
        editor.undoManager.redo();
      }
    }

    window.addEventListener("keydown", handleKey, { capture: true });

    return () => {
      //
      window.removeEventListener("keydown", handleKey, { capture: true });
    };
  }, [editor]);
}
