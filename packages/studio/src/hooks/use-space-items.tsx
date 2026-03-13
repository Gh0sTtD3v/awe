import React, { useMemo } from "react";
import { Component3DData } from "@oncyberio/engine";
import { GameData } from "../types/game-data";
import { useCurrentGameData } from "../contexts/game-data-context";
import {
  useComponentTypes,
  useComponentTypesMap,
  ComponentFactoryClass,
  isWorldSetting,
} from "./component-hooks";
import AddAsset from "../ui/icons/add-asset";
import Script from "../ui/icons/script";
import WorldSettings from "../ui/icons/world-settings";
import IconImg from "../ui/icon-image";

export const iconsByType = {
  _: "world-build",
  kitbash: "cubes",
  script: "zap",
};

export function getIcon(type: string) {
  const icon = iconsByType[type] ?? iconsByType._;

  return <IconImg name={icon} size={22} style={{ filter: "invert(1)" }} />;
}

type AssetType = string;

export interface SpaceItemInfo<T = any> {
  id: string;
  name: string;
  image: string;
  icon?: React.ReactElement;
  group?: string;
  hint: string;
  type: string;
  isRequired: boolean;
  item: T;
  children?: SpaceItemInfo[];
}

export type SpaceItems = Record<AssetType, SpaceItemInfo[]>;

export type SpaceItemTypes = keyof SpaceItems;

export type SpaceItemsFilter = {
  query?: string;
  byType?: Record<SpaceItemTypes, boolean>;
  byName?: string;
};

type ComponentData = GameData["components"][string];

export function filterByType(components: ComponentData[], type: string) {
  return Object.values(components).filter((it) => it.componentType === type);
}

export function useSpaceItems() {
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
    }

    return image;
  }

  const result = useMemo(() => {
    //
    let groupMap: Record<string, SpaceItemInfo[]> = {};

    let groups: SpaceItemInfo[] = [];

    function addTypeGroup(opts: {
      type: string;
      name?: string;
      icon?: React.ReactElement;
      image?: string;
      parent?: string;
    }) {
      const factory = cTypeMap[opts.type];

      const group: SpaceItemInfo = {
        id: opts.type,
        type: opts.type,
        name: opts.name ?? opts.type,
        image: opts.image ?? factory?.info.image,
        icon: opts.icon,
        hint: "",
        isRequired: factory?.info.required,
        children: [],
        item: null,
      };

      groupMap[opts.type] = group.children;

      let parent = opts.parent ? groupMap[opts.parent] : groups;

      parent.push(group);

      return group;
    }

    function addComponentItem(component: ComponentData, parent: string) {
      const factory = cTypeMap[component.type];

      const item: SpaceItemInfo = {
        id: component.id,
        type: component.type,
        group: parent,
        name: factory.getTitle(component as Component3DData),
        image: getPreviewImg(component),
        hint: factory.info.help?.tip,
        isRequired: factory.info.required,
        item: component,
      };

      if (!groupMap[parent]) {
        //
        addTypeGroup({ type: parent });
      }

      groupMap[parent].push(item);

      return item;
    }

    addTypeGroup({
      type: "addedAssets",
      name: "Added Assets",
      icon: <AddAsset />,
    });

    addTypeGroup({
      type: "worldSettings",
      name: "World Settings",
      icon: <WorldSettings />,
    });

    addTypeGroup({ type: "scripts", name: "Scripts", icon: <Script /> });

    let totalByType: Record<AssetType, number> = {};

    let total = 0;

    for (let i = 0; i < components.length; i++) {
      //
      const component = components[i];

      if (component == null) debugger;

      const factory = cTypeMap[component.type];

      if (factory == null) {
        console.error(`No factory for component type: ${component.type}`);

        continue;
      }

      if (isWorldSetting(factory)) {
        addComponentItem(component, "worldSettings");
      } else if (component.type === "script") {
        addComponentItem(component, "scripts");
      } else {
        let type = component.type;

        if (groupMap[type] == null) {
          addTypeGroup({ type, parent: "addedAssets" });
        }

        addComponentItem(component, type);
      }
    }

    return { groups, totalByType, total };
  }, [components]);

  return result;
}
