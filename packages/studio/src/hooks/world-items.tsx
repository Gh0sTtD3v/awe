import { useMemo } from "react";
import { useCurrentGameData } from "../contexts/game-data-context";
import {
  useComponentTypesMap,
  getComponentPrimaryGroup,
  getComponentSeondaryGroup,
} from "./component-hooks";
import { GameData } from "../types/game-data";
import { Component3DData } from "@oncyberio/engine";

export interface AddedAssetGroup {
  id: string;
  name: string;
  image?: string;
  children: ComponentInfo[];
  count?: number;
}

export interface ComponentInfo {
  id: string;
  name: string;
  image?: string;
  group?: string;
  hint: string;
  type: string;
  data: ComponentData;
  items?: ComponentInfo[];
}

type ComponentData = GameData["components"][string];

export function useAddedAssets() {
  //
  const { gameData } = useCurrentGameData();

  const cTypeMap = useComponentTypesMap();

  const components = useMemo(
    () => Object.values(gameData.components),
    [gameData.components]
  );

  function getPreviewImg(component: ComponentData) {
    let factory = cTypeMap[component.type];

    let image = factory.info.image;

    if (component.type === "image") {
      image = component.url;
    } else if (component.type === "avatar") {
      // @ts-ignore
      image = component.image ?? image;
    }

    return image;
  }

  const result = useMemo(() => {
    //
    let groupMap: Record<string, ComponentInfo[]> = {};

    let groups: AddedAssetGroup[] = [];

    function addTypeGroup(type: string) {
      const factory = cTypeMap[type];

      if (factory == null) debugger;

      const group: AddedAssetGroup = {
        id: type,
        name: factory.info.title,
        image: factory.info.image,
        count: 0,
        children: [],
      };

      groupMap[type] = group.children;

      groups.push(group);

      return group;
    }

    function addComponentItem(component: ComponentData) {
      const factory = cTypeMap[component.type];

      if (factory == null) return;

      const parent = getComponentSeondaryGroup(component);
      const name = factory.getTitle(component as Component3DData);

      const item: ComponentInfo = {
        id: component.id,
        type: component.type,
        group: parent,
        name: name,
        image: getPreviewImg(component),
        hint: factory.info.help?.tip,
        data: component,
      };

      if (!groupMap[parent]) {
        //
        addTypeGroup(parent);
      }

      if (groupMap[parent][name]) {
        groupMap[parent][name].items.push(item);
      } else {
        groupMap[parent][name] = {
          name: name,
          items: [],
        };
        groupMap[parent][name].items.push(item);
      }

      // TODO : return correct count to higher level
      // groupMap[parent].count = groupMap[parent].count + 1;
      // console.log("groupMap[parent]", groupMap, groupMap[parent], parent);

      return item;
    }

    for (let i = 0; i < components.length; i++) {
      //
      const component = components[i];

      if (component == null) debugger;

      const topGroup = getComponentPrimaryGroup(component);

      if (topGroup != "addedAssets") {
        continue;
      }

      addComponentItem(component);
    }

    return groups;
  }, [components]);

  return result;
}

export function useWorldSettings() {
  //
  const { gameData } = useCurrentGameData();

  const cTypeMap = useComponentTypesMap();

  const components = useMemo(
    () => Object.values(gameData.components),
    [gameData.components]
  );

  const result = useMemo(() => {
    //
    let worldSettings: ComponentInfo[] = [];

    for (let i = 0; i < components.length; i++) {
      //
      const component = components[i];

      if (component == null) debugger;

      const topGroup = getComponentPrimaryGroup(component);

      if (topGroup != "worldSettings") {
        continue;
      }

      const factory = cTypeMap[component.type];

      if (factory == null) continue;

      const parent = getComponentSeondaryGroup(component);

      const item: ComponentInfo = {
        id: component.id,
        type: component.type,
        group: parent,
        items: [],
        name: component?.name || factory.info?.title || component.id,
        image: factory.info.image,
        hint: factory.info.help?.tip,
        data: component,
      };

      worldSettings.push(item);
    }

    return worldSettings;
  }, [components]);

  return result;
}

export function useScriptList() {
  //
  const { gameData } = useCurrentGameData();

  const components = useMemo(
    () => Object.values(gameData.components),
    [gameData.components]
  );

  const scripts = useMemo(() => {
    //
    const groups = {
      gameScripts: [],
      npmScripts: [],
    };

    for (let i = 0; i < components.length; i++) {
      //
      const component = components[i];

      if (component == null) debugger;

      const topGroup = getComponentPrimaryGroup(component);

      if (topGroup != "scripts") {
        continue;
      }
      const item: ComponentInfo = {
        id: component.id,
        type: component.type,
        name: component.external ? component.uri : component.name,
        image: "",
        hint: "",
        data: component,
      };

      if (component.external) {
        groups.npmScripts.push(item);
      } else {
        groups.gameScripts.push(item);
      }
    }

    return groups;
    //
  }, [gameData.components]);

  return scripts;
}
