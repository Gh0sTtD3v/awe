import { useCurrentGameData } from "../contexts/game-data-context";
import { useEditorService } from "../contexts/editor-service-context";
import React, { useMemo } from "react";
import { useEventCallback } from "./use-event-callback";
import { useComponentTypesMap } from "./component-hooks";
import { Component3DData } from "@oncyberio/engine";
import { useComponentAddHandler } from "./use-component-add-handler";

export function useComponentCard(type: string) {
  //
  const types = useComponentTypesMap();

  const handler = useComponentAddHandler((type: string) => {
    //
    return {
      type,
    };
  });

  const factory = types[type];

  if (!factory) {
    console.error("Factory Not Found:", type);
    return;
  }

  let { gameData } = useCurrentGameData();

  const { editor } = useEditorService();

  const validateCreate = useMemo(() => {
    //
    // if(factory.info.type === "water") debugger;
    return factory.validateCreation(gameData.components as Record<string, Component3DData>);
    //
  }, [gameData.components]);

  const isSingleton = factory.info.singleton;

  const exists = gameData.components[factory.info.type];

  const canSelect = isSingleton ? exists : false;

  const canDelete = !factory.info.required && exists && isSingleton;

  const canAdd = !(isSingleton && exists) && validateCreate.success;

  const candDrag = canAdd && factory.info.draggable;

  const handleClick = (e: React.MouseEvent) => {
    //

    console.log("factory.info.type", factory.info.type);

    if (!canAdd) {
      //
      if (isSingleton) {
        //
        const instance = editor.getComponent(factory.info.type);

        if (instance) {
          editor.selectComponents([instance.data.id]);
        }
      }

      return;
    }

    handler.handleAdd(factory.info.type);
  };

  const handleDrag = useEventCallback((e: React.DragEvent) => {
    //
    if (candDrag) {
      //
      handler.handleDrag(e, factory.info.type);
    }
  }, []);

  const handleDelete = useEventCallback((e: React.UIEvent) => {
    //
    if (canDelete) {
      //
      e.stopPropagation();

      const instance = editor.getComponent(factory.info.type);

      if (instance) {
        //
        editor.deleteComponents([instance.data.id]);
      }
    }
  }, []);

  const disabled = !exists && !canAdd;

  const tooltip = disabled ? validateCreate.message : factory.info.help?.desc;

  return {
    title: factory.info.title,
    image: factory.info.image,
    description: factory.info.description,
    tipNeeded: factory.info.tipNeeded,
    action: exists ? "edit" : "add",
    disabled,
    tooltip,
    handleClick,
    handleDrag: candDrag ? handleDrag : undefined,
    handleDelete: canDelete ? handleDelete : undefined,
    //
    exists,
    canAdd,
    canDelete,
    canSelect,
    candDrag,
  } as const;
}
