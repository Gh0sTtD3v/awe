// Re-export Space and component types
export { Space } from "./space";
export { ComponentManager } from "./components/index";
export { Formats } from "./formats";
export { SpaceEvents } from "./space-events";
export type { SpaceEventHandlers, SpaceEventListeners } from "./space-events";
export { Component3D } from "./abstract/component-3d";
export type { Component3DData } from "./abstract/component-3d-data";
export type { ComponentFactory } from "./abstract/component-factory";
export type { ComponentInfo } from "./abstract/component-info";
export { VisualPluginRegistry } from "./components/visual-plugin-registry";
export type {
  InstancedAttribute,
  ShaderPlugin,
  VisualPlugin,
  VisualPluginClass,
} from "./components/visual-plugin-types";

// Component classes
export { AudioComponent } from "./components/audio/audio-component";
export { AvatarComponent } from "./components/avatar/avatar-component";
export { BackgroundComponent } from "./components/background/background-component";
export { BatchComponent } from "./components/batch/batch-component";
export { BirdComponent } from "./components/bird/bird-component";
export { CameraComponent } from "./components/camera/camera-component";
export { CloudComponent } from "./components/cloud/cloud-component";
export { DestinationComponent } from "./components/destination/destination-component";
export { DialogComponent } from "./components/dialog/dialog-component";
export { DustComponent } from "./components/dust/dust-component";
export { EnvmapComponent } from "./components/envmap/envmap-component";
export { FogComponent } from "./components/fog/fog-component";
export { GodrayComponent } from "./components/godray/godray-component";
export { GrassComponent } from "./components/grass/grass-component";
export { GroupComponent } from "./components/group/group-component";
export { IframeComponent } from "./components/iframe/iframe-component";
export { ImageComponent } from "./components/image/image-component";
export { ImpactComponent } from "./components/impact/impact-component";
export { InstancedMeshComponent } from "./components/instancedmesh/instanced-mesh-component";
export { InteractionComponent } from "./components/interaction/interaction-component";
export { LightingComponent } from "./components/lighting/lighting-component";
export { MeshComponent } from "./components/mesh/mesh-component";
export { ModelComponent } from "./components/model/model-component";
export { NavmeshComponent } from "./components/navmesh/navmesh-component";
export { ObjectComponent } from "./components/object/object-component";
export { ParticlesComponent } from "./components/particles/particles-component";
export { PostProcessingComponent } from "./components/postprocessing/post-pro-component";
export { QuarksComponent } from "./components/quarks/quarks-component";
export { RainComponent } from "./components/rain/rain-component";
export { ReflectorComponent } from "./components/reflector/reflector-component";
export { SplineComponent } from "./components/spline/spline-component";
export { TerrainComponent } from "./components/terrain/terrain-component";
export { TextComponent } from "./components/text/text-component";
export { VideoComponent } from "./components/video/video-component";
export { VRMAnimsComponent } from "./components/vrmanims/vrm-anims-component";
export { WaterComponent } from "./components/water/water-component";
export { WaveComponent } from "./components/wave/wave-component";

// SpaceFactory singleton
export { default } from "./space-factory";
