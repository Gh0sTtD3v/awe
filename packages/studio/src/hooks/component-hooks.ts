import type { ComponentData, Component3D, ComponentFactory } from "@oncyberio/engine";
import { useMemo } from "react";
import { EngineFacade } from "../utils/engine-api";
import { useObservable } from "./use-observable";

export type ComponentFactoryClass = typeof ComponentFactory<any>;

const exludedComponents = {
  script: true,
  dust: true,
  impact: true,
};

export function useComponentTypes() {
  //
  const options: ComponentFactoryClass[] =
    EngineFacade.editor.componentsRegistry.getComponentTypes();

  return useMemo(() => {
    //

    return options.filter((factory) => {
      return !exludedComponents[factory.info.type];
    });
    //
  }, [options]);
}

export function useWorldSettings() {
  //
  const allComponents = useComponentTypes();

  // console.log("allComponentsallComponents", allComponents);

  return useMemo(() => {
    const filteredComponents = allComponents
      .filter(isWorldSetting)
      .filter((factory) => {
        return factory.info.kind !== "script";
      })
      .map((factory) => {
        return {
          type: factory.info.type,
          description: factory.info.description,
          title: factory.info.title,
          tipNeeded: factory.info.tipNeeded,
        };
      });

    return filteredComponents;
  }, [allComponents]);
}

export function useComponentLibrary() {
  const allComponents = useComponentTypes();

  return useMemo(() => {
    return allComponents.filter(isLibComponent).map((factory) => {
      return {
        type: factory.info.type,
        title: factory.info.title,
      };
    });
  }, [allComponents]);
}

export function useComponentTypesMap() {
  //
  const options = useObservable(EngineFacade.editor.state.factories);

  return useMemo(() => {
    let result: Record<string, ComponentFactoryClass> = {};

    options.forEach((component) => {
      result[component.info.type] = component;
    });

    return result;
  }, [options]);
}

export function isWorldSetting(component: ComponentFactoryClass) {
  return (
    component.info.singleton || component.info.studioTab === "worldSettings"
  );
}

const componentGroups = {
  script: true,
  kitbash: true,
  image: true,
  video: true,
  model: true,
  avatar: true,
};

export function isLibComponent(component: ComponentFactoryClass) {
  return !isWorldSetting(component) && !componentGroups[component.info.type];
}

export type ComponentTopGroup =
  | "worldSettings"
  | "addedAssets"
  | "scripts";

export function getComponentPrimaryGroup(
  component: ComponentData
): ComponentTopGroup {
  //
  if (component.type === "script") {
    return "scripts";
  }

  const typeMap = EngineFacade.editor.componentsRegistry.getComponentTypeMap();

  const factory = typeMap[component.type];

  if (factory == null) return null;

  if (factory.info.singleton && !factory.info.custom) {
    return "worldSettings";
  }

  return "addedAssets";
}

export function getComponentSeondaryGroup(
  component: ComponentData
): ComponentTopGroup {
  //
  return component.type;
}

export function canReplaceComponent(component: Component3D) {
  //
  return (
    component != null &&
    !component.info.singleton &&
    (component.getCollisionMesh?.() != null || component.data.type === "group")
  );
}
