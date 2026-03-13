// @ts-check

import { useDispatcher } from "./dispatcher";
import { useInput } from "./use-input";
import { useEditorService } from "../../contexts/editor-service-context";

export function useMap(opts) {
  //
  const itemConfig = opts.itemGui;

  const { editor } = useEditorService();

  const disptacher = useDispatcher();

  const { onChange, value } = useInput({
    source: opts.value,
    onChange: opts.onChange,
    format: opts.format,
    locked: opts.locked,
  });

  if (typeof value !== "object") {
    //
    throw new Error("Not an object");
  }

  const onAdd = !opts.readonly
    ? () => {
        //
        const newVal = opts.createNewData();

        onChange([...value, newVal], false, { oldValue: value });
      }
    : null;

  const onRemove = !opts.readonly
    ? (key: string) => {
        //
        const newVal = value.filter((it) => it.key !== key);

        onChange(newVal, false, { oldValue: value });
      }
    : null;

  const onReset = () => {
    //
    onChange(opts.reset(), false, { oldValue: value });
  };

  return {
    items: value,
    onAdd,
    onReset,
    onRemove,
  };
}
