import { ComponentFactory } from "../abstract/component-factory";

import { TerrainComponentFactoryHeadless } from "./terrain/index-headless";
import { MeshComponentFactoryHeadless } from "./mesh/index-headless";
import { ModelComponentFactoryHeadless } from "./model/index-headless";
import { AvatarComponentFactoryHeadless } from "./avatar/index-headless";
import { DestinationComponentFactory } from "./destination";
import { GroupComponentFactory } from "./group";
import { NavmeshComponentFactory } from "./navmesh";
import { ObjectComponentFactory } from "./object";

export const coreComponents: Array<typeof ComponentFactory<any>> = [
  TerrainComponentFactoryHeadless,
  MeshComponentFactoryHeadless,
  ModelComponentFactoryHeadless,
  AvatarComponentFactoryHeadless,
  DestinationComponentFactory,
  GroupComponentFactory,
  NavmeshComponentFactory,
  ObjectComponentFactory,
];

export const components = coreComponents;
