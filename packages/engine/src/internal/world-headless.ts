import emitter from "./engine-emitter";
import { EngineEvents } from "./engine-events";
import { Group } from "three";
import Scene from "./scene";
import { ShaderOverride } from "./xtend";
import { Subsystems } from "./subsystems";
import {
  GltfLoaderHeadless,
  headlessTextureStub,
} from "./loader-headless";
import SpaceFactory from "../space/space-factory";
import type { SpaceOpts } from "../@types/space-opts";
import type { Space } from "../space/space";
import type { WorldAdapter } from "./world";

export class WorldHeadless extends Group implements WorldAdapter {
  runtime = "headless" as const;
  currentSpace: Space | null = null;

  constructor() {
    super();
    this.name = "ROOT";
    this.matrixAutoUpdate = false;
    ShaderOverride();
  }

  async preload(): Promise<void> {
    Subsystems.gltf = new GltfLoaderHeadless();
    Subsystems.textures = headlessTextureStub;
    Scene.add(this);
  }

  async createSpace(opts: SpaceOpts): Promise<Space> {
    const space = await SpaceFactory.get(opts);
    this.currentSpace = space;
    this.add(space);
    emitter.emit(EngineEvents.SPACE_CREATED, { space });
    return space;
  }

  async destroyCurrentSpace(): Promise<void> {
    if (this.currentSpace) {
      this.remove(this.currentSpace);
      SpaceFactory.dispose(this.currentSpace);
      emitter.emit(EngineEvents.SPACE_DISPOSED);
    }
    this.currentSpace = null;
  }

  async dispose(): Promise<void> {
    await this.destroyCurrentSpace();
    Scene.remove(this);
  }

  play(): void {
    // no-op in headless
  }

  pause(): void {
    // no-op in headless
  }

  get isPlaying(): boolean {
    return false;
  }

  resize(_opts: { w: number; h: number }): void {
    // no-op in headless
  }
}
