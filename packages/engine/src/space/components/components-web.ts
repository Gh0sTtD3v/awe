import { ComponentFactory } from "../abstract/component-factory";

import { AvatarComponentFactory } from "./avatar";
import { MeshComponentFactory } from "./mesh";
import { ModelComponentFactory } from "./model";
import { TerrainComponentFactory } from "./terrain";
import { DestinationComponentFactory } from "./destination";
import { GroupComponentFactory } from "./group";
import { NavmeshComponentFactory } from "./navmesh";
import { ObjectComponentFactory } from "./object";
import { BackgroundComponentFactory } from "./background";
import { LightingComponentFactory } from "./lighting";
import { WaterComponentFactory } from "./water";
import { FogComponentFactory } from "./fog";
import { PostProComponentFactory } from "./postprocessing";
import { ReflectorComponentFactory } from "./reflector";
import { RainComponentFactory } from "./rain";
import { EnvmapComponentFactory } from "./envmap";
import { VRMAnimsComponentFactory } from "./vrmanims";
import { TextComponentFactory } from "./text";
import { ImageComponentFactory } from "./image";
import { VideoComponentFactory } from "./video";
import { WaveComponentFactory } from "./wave";
import { CloudComponentFactory } from "./cloud";
import { GodrayComponentFactory } from "./godray";
import { BirdComponentFactory } from "./bird";
import { GrassComponentFactory } from "./grass";
import { DustComponentFactory } from "./dust";
import { ImpactComponentFactory } from "./impact";
import { DialogComponentFactory } from "./dialog";
import { CameraComponentFactory } from "./camera";
import { BatchComponentFactory } from "./batch";
import { IframeComponentFactory } from "./iframe";
import { ParticlesComponentFactory } from "./particles";
import { QuarksComponentFactory } from "./quarks";
import { AudioComponentFactory } from "./audio";
import { InteractionComponentFactory } from "./interaction";
import { InstancedMeshComponentFactory } from "./instancedmesh";
import { SplineComponentFactory } from "./spline";
import { PortalComponentFactory } from "./portal";

export const components: Array<typeof ComponentFactory<any>> = [
  // core (web variants)
  AvatarComponentFactory,
  MeshComponentFactory,
  ModelComponentFactory,
  TerrainComponentFactory,
  DestinationComponentFactory,
  GroupComponentFactory,
  NavmeshComponentFactory,
  ObjectComponentFactory,
  // web-only
  AudioComponentFactory,
  InteractionComponentFactory,
  InstancedMeshComponentFactory,
  SplineComponentFactory,
  PortalComponentFactory,
  BackgroundComponentFactory,
  LightingComponentFactory,
  WaterComponentFactory,
  FogComponentFactory,
  PostProComponentFactory,
  ReflectorComponentFactory,
  RainComponentFactory,
  EnvmapComponentFactory,
  VRMAnimsComponentFactory,
  TextComponentFactory,
  ImageComponentFactory,
  VideoComponentFactory,
  WaveComponentFactory,
  CloudComponentFactory,
  GodrayComponentFactory,
  BirdComponentFactory,
  GrassComponentFactory,
  DustComponentFactory,
  ImpactComponentFactory,
  DialogComponentFactory,
  CameraComponentFactory,
  BatchComponentFactory,
  IframeComponentFactory,
  ParticlesComponentFactory,
  QuarksComponentFactory,
];
