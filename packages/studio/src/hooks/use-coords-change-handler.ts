import { TransformChange } from "@oncyberio/engine-edit/types";
import { useEditorService } from "../contexts/editor-service-context";
import { UpdateComponentsPayload } from "../services/editor/commands/update-components";
import { useWorldEvent } from "./use-world-event";
import { EngineFacade } from "../utils/engine-api";

export function useCoordsChangeHandler() {
  //
  const { editor } = useEditorService();

  useWorldEvent(
    EngineFacade.Events.COMPONENTS_COORDS_CHANGED,
    (opts: { changes: TransformChange[] }) => {
      //

      const changes: UpdateComponentsPayload[] = opts.changes.map((change) => {
        //
        return {
          id: change.targetMesh.data.id,
          changes: change.changes,
          undo: change.undo,
        };
      });

      editor.updateComponents(changes);
    }
  );
}
