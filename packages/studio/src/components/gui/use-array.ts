// @ts-check

import { useDispatcher } from "./dispatcher";
import { useInput } from "./use-input";
import { useEditorService } from "../../contexts/editor-service-context";

export function useArray(opts) {
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

  // A component saved before the list existed has no value yet: treat as empty.
  const items = Array.isArray(value) ? value : value == null ? [] : null;
  if (items == null) {
    //
    throw new Error("Not an array");
  }

  const onAdd = !opts.readonly
    ? () => {
        //
        const newVal = opts.createNewData ? opts.createNewData() : {};

        onChange([...items, newVal], false, { oldValue: value });
      }
    : null;

  const onRemove = !opts.readonly
    ? (idx: number) => {
        //
        if (idx < 0 || idx >= items.length) {
          //
          throw new Error("Index out of bounds " + idx);
        }

        onChange(
          items.filter((it, i) => i !== idx),
          false,
          { oldValue: value }
        );
      }
    : null;

  const onReset = () => {
    //
    onChange(opts.reset ? opts.reset() : [], false, { oldValue: value });
  };

  return {
    items,
    onAdd,
    onReset,
    onRemove,
  };
}

export function rewriteLenses(gui, fn) {
  //
  if (Array.isArray(gui.value)) {
    //
    gui = fn(gui);
  }

  if (gui.children) {
    //
    gui = {
      ...gui,
      children: { ...gui.children },
    };

    Object.keys(gui.children).forEach((key) => {
      //
      gui.children[key] = rewriteLenses(gui.children[key], fn);
    });
  }

  if (gui.itemGui) {
    gui = {
      ...gui,
      itemGui: rewriteLenses(gui.itemGui, fn),
    };
  }

  return gui;
}
