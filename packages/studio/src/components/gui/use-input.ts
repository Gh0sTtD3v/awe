// @ts-check

import { useRef } from "react";
import { idFormat } from "./formats";
import { useDispatcher } from "./dispatcher";
import { useEventCallback } from "../../hooks/use-event-callback";
import { deepEqual } from "../../utils/js";
import { showError } from "../../modals/context";
import { reviveLens } from "./revive-lens";
import { getOrCreateEditor } from "@oncyberio/engine-edit/editors/editor-registry";

export function useInput({
  source,
  onChange: _onChange = null,
  format = idFormat,
  validate = null,
  locked: _isLocked = null,
  onSave = null,
  opts = {},
}) {
  //
  const dispatcher = useDispatcher();

  const componentId = dispatcher.component.data.id;

  // if(source?.[2] == "identifier") debugger

  const lens = getOrCreateEditor(dispatcher.component)?.getLens(source);

  const dataValue = lens.get();

  const uiValue = format.format(dataValue, opts);

  const startValueRef = useRef(lens.get());

  const isProgressRef = useRef(false);

  const onChange = useEventCallback(
    (newUiValue, isProgress, opts?: { oldValue }) => {
      //
      // if (!isProgress) debugger;

      if (locked) return;

      const prevUIValue = format.format(lens.get(), opts);

      if (
        isProgress === isProgressRef.current &&
        deepEqual(prevUIValue, newUiValue)
      )
        return;

      isProgressRef.current = isProgress;

      return new Promise((resolve, reject) => {
        //
        const newDataValue = format.parse(newUiValue, dataValue, opts);

        let info: any = null;

        let undo = null;

        if (!isProgress) {
          //
          // validate
          if (validate) {
            //
            try {
              validate(newDataValue);
            } catch (e) {
              //
              console.error(e);

              showError(e.message, "Validation Error");

              setTimeout(() => dispatcher.dispatch(null));

              return resolve(null);
            }
          }

          if (dispatcher.supportsUndo) {
            //
            const oldValue = opts?.oldValue ?? startValueRef.current;

            undo = async () => {
              //
              // debugger;
              const newLens = reviveLens(dispatcher.space, lens);

              newLens.set(oldValue);

              _onChange?.(newLens.get(), false);
            };

            info = {
              prop: lens.prop ?? "",
              oldValue,
              newValue: newDataValue,
            };
          }

          startValueRef.current = newDataValue;
        }

        const setNewValue = async (lens) => {
          //
          lens.set(newDataValue, { isProgress });

          if (_onChange) {
            //
            await Promise.resolve(_onChange?.(newDataValue, isProgress));
          }

          if (!isProgress && typeof onSave === "function") {
            //
            let data = await Promise.resolve(onSave(newDataValue));

            if (data !== undefined && data !== newDataValue) {
              //
              lens.set(data, { isProgress });
            }
          }

          resolve(null);
          //
        };

        // if (!isProgress) debugger;

        // const isPrefab = lens.isPrefabMode();

        dispatcher.dispatch({
          origin: "input",
          run: async () => {
            //
            await setNewValue(lens);

            if (undo) {
              //
              return {
                info,
                undo,
                redo: () => {
                  //
                  const newLens = reviveLens(dispatcher.space, lens);

                  return setNewValue(newLens);
                },
              };
            }
          },
          isProgress,
          changes: null,
        });
      });
    },
    []
  );

  const locked = _isLocked?.() ?? lens.isLocked;

  return { value: uiValue, onChange, locked };
}
