import { useMemo } from "react";
import { useCurrentGameData } from "../contexts/game-data-context";
import { useComponentTypesMap } from "./component-hooks";
import { use3DLibrary } from "./use-3d-library";
import { GameData } from "../types/game-data";

export interface ComponentInfo {
  id: string;
  name: string;
  image: string;
  group?: string;
  hint: string;
  type: string;
  data: ComponentData;
  children?: ComponentInfo[];
  _index?: number;
}

export interface AddedAssetGroup {
  id: string;
  name: string;
  image?: string;
  children: ComponentInfo[];
}

export interface GroupedWorldItems {
  globals: ComponentInfo[];
  presets: ComponentInfo[];
  portals: ComponentInfo[];
  chunkData: ComponentInfo[];
}

type ComponentData = GameData["components"][string];

const DEFAULT_MODEL_IMAGE =
  "https://cyber.mypinata.cloud/ipfs/QmdMuK7WHQtmhRWK5weDfdptXg6iSnu9Rox2wfYqGkFNBd";

const GLOBAL_TYPES = new Set(["avatar", "vrm-anims"]);
const PRESET_TYPES = new Set([
  "water", "reflector", "background", "envmap",
  "lighting", "fog", "postprocessing",
]);

function getItemCategory(comp: ComponentData): keyof GroupedWorldItems {
  if (GLOBAL_TYPES.has(comp.type)) return "globals";
  if (PRESET_TYPES.has(comp.type)) return "presets";
  if (comp.type === "portal") return "portals";
  return "chunkData";
}

export function useWorldItems() {
  const { store } = useCurrentGameData();

  const components = store.treeModel.getRoots();

  const cTypeMap = useComponentTypesMap();

  const { data: library3D } = use3DLibrary();

  const libraryByUrl = useMemo(() => {
    const map = new Map<string, string>();
    if (library3D) {
      for (const item of library3D) {
        if (item.url?.pinata) {
          map.set(item.url.pinata, item.image?.pinata);
        }
      }
    }
    return map;
  }, [library3D]);

  const result = useMemo(() => {

    function getPreviewImg(component: ComponentData) {
      let factory = cTypeMap[component.type];

      let image = factory.info.image;

      if (component.type === "image") {
        image = component.url || image;
      } else if (component.type === "avatar") {
        if (component.image) {
          image = component.image;
        }
      } else if (component.type === "model") {
        const libImage = libraryByUrl.get(component.url);
        image = libImage || DEFAULT_MODEL_IMAGE;
      }

      return image;
    }

    function getName(component: ComponentData, factory) {
      return component.name || factory?.info?.title || component.type;
    }

    function formatComponent(component: ComponentData) {
      const factory = cTypeMap[component.type];

      if (factory == null) return;

      let name = getName(component, factory);

      const children = Object.values(component.children || {});

      const item: ComponentInfo = {
        id: component.id,
        type: component.type,
        name,
        image: getPreviewImg(component),
        hint: factory.info.help?.tip,
        data: component,
        children: children.map(formatComponent),
        _index: component._index,
      };

      return item;
    }

    return components.map(formatComponent).filter(Boolean);
  }, [components, cTypeMap, libraryByUrl]);

  return result;
}

export function useGroupedWorldItems(): GroupedWorldItems {
  const items = useWorldItems();

  return useMemo(() => {
    const grouped: GroupedWorldItems = {
      globals: [],
      presets: [],
      portals: [],
      chunkData: [],
    };

    for (const item of items) {
      if (!item) continue;
      const category = getItemCategory(item.data);
      grouped[category].push(item);
    }

    return grouped;
  }, [items]);
}
