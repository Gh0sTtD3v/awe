import {
  createContext,
  useRef,
  useMemo,
  useContext,
  useSyncExternalStore,
  MutableRefObject,
  useEffect,
  useState,
  use,
} from "react";
import { WorldEditorService } from "../services/editor";

import { useUndoManager } from "../hooks/use-undo-manager";
import { useCurrentGameData } from "./game-data-context";

export interface EditorServiceProps {
  children: React.ReactNode;
}

type EditorServiceState = {
  editor: WorldEditorService;
  ref: MutableRefObject<WorldEditorService>;
};

const EditorServiceContext = createContext<EditorServiceState>(null);

export function EditoServiceProvider({ children }: EditorServiceProps) {
  //
  const { store } = useCurrentGameData();

  const editorServiceRef = useRef<WorldEditorService>(null);

  const editorService = useMemo(() => {
    //
    return new WorldEditorService({
      store,
    });
  }, [store]);

  const [undoState, setUndoState] = useState(
    editorService.undoManager.getState()
  );

  editorServiceRef.current = editorService;

  useUndoManager(editorService);

  useEffect(() => {
    //
    editorService.init();

    globalThis["$$eds"] = editorService;

    const disposeUndoListener = editorService.undoManager.subscribeState(() => {
      //
      setUndoState(editorService.undoManager.getState());
    });

    return () => {
      //
      disposeUndoListener();

      editorService.dispose();
    };
  }, [editorService]);

  const value = {
    editor: editorService,
    ref: editorServiceRef,
  };

  return (
    <EditorServiceContext.Provider value={value}>
      {children}
    </EditorServiceContext.Provider>
  );
}

export function useEditorService() {
  return useContext(EditorServiceContext);
}
