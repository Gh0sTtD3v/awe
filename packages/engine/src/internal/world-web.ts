import {
  STATS,
  SET_GPU_TIER,
  SET_SHADOW_NEEDS_UPDATE,
} from "./constants";
import Renderer from "./renderer";
import emitter from "./engine-emitter";
import { EngineEvents } from "./engine-events";
import { Group } from "three";
import Scene from "./scene";
import Camera from "../camera";
import RenderStats from "./utils/stats";
import SpaceFactory from "../space";
import PostProcessing from "./rendering/postprocessing";
import StarfieldTunnel, { STARFIELD_STATES } from "./resources/scenes/tunnel";
import { ShaderOverride } from "./xtend";
import Mediator from "./mediator";
import Loader from "./loader";
import { Subsystems } from "./subsystems";
import { SET_LIGHTING_STATE } from "./lighting-state";
import CSS3D from "./css3d/renderer";
import { getGPUTier } from "detect-gpu";
import type { SpaceOpts } from "../@types/space-opts";
import type { Space } from "../space/space";
import type { WorldAdapter } from "./world";

export class WorldWeb extends Group implements WorldAdapter {
  runtime = "web" as const;
  currentSpace: Space | null = null;

  private _eventsBound = false;

  private _onPreRender = () => this.dawnupdate();
  private _onRender = (delta: number) => this.update(delta);
  private _onPostRender = () => this.duskupdate();
  private _onResize = (w: number, h: number) => Renderer.setSize(w, h);

  constructor() {
    super();
    this.name = "ROOT";
    this.matrixAutoUpdate = false;
    Loader.renderer = Renderer;
    Subsystems.gltf = Loader;
    Subsystems.textures = Loader;
    Subsystems.envmap = Loader;
    Subsystems.renderer = Renderer;
    ShaderOverride();
  }

  async preload(): Promise<void> {
    this.addEvents();
    Scene.add(this);
    SET_GPU_TIER(await getGPUTier());
    await StarfieldTunnel.preload();
    Loader.addKTX();
  }

  private _isIntroVisible = false;

  showIntro(): Promise<void> {
    if (this._isIntroVisible) {
      console.warn("Intro already visible");
      return Promise.resolve();
    }
    this._isIntroVisible = true;
    Scene.visible = false;
    return StarfieldTunnel.setState(STARFIELD_STATES.INTRO);
  }

  hideIntro(): Promise<void> {
    if (!this._isIntroVisible) {
      console.warn("Intro not visible");
      return Promise.resolve();
    }
    this._isIntroVisible = false;
    Scene.visible = true;
    SET_SHADOW_NEEDS_UPDATE(true);
    return StarfieldTunnel.setState(STARFIELD_STATES.GAME);
  }

  async createSpace(opts: SpaceOpts): Promise<Space> {
    const space = await SpaceFactory.get(opts);
    this.currentSpace = space;
    this.add(space);
    emitter.emit(EngineEvents.SPACE_CREATED, { space });
    SET_SHADOW_NEEDS_UPDATE(true);
    this.updateLightingState();
    return space;
  }

  async destroyCurrentSpace(): Promise<void> {
    if (this.currentSpace) {
      this.remove(this.currentSpace);
      SpaceFactory.dispose(this.currentSpace);
      emitter.emit(EngineEvents.SPACE_DISPOSED);
    }
    this.currentSpace = null;
    SET_SHADOW_NEEDS_UPDATE(true);
    this.updateLightingState();
  }

  async dispose(): Promise<void> {
    this.removeEvents();
    await this.destroyCurrentSpace();
    Scene.remove(this);
    this._isIntroVisible = false;
    Scene.visible = true;
  }

  private updateLightingState(): void {
    if (SpaceFactory.current?.lighting?._lighting?.active === true) {
      SET_LIGHTING_STATE(true);
    } else {
      SET_LIGHTING_STATE(false);
    }
  }

  dawnupdate(): void {
    Renderer.info.reset();
  }

  update(_delta: number): void {
    Renderer.clear(true, true, true);
    this.updateLightingState();
    CSS3D.active = true;
    CSS3D.update(Scene, Camera.current, {});
    PostProcessing.render(Scene, Camera.current, null);
  }

  duskupdate(): void {
    if (STATS) {
      RenderStats.update();
    }
  }

  private addEvents(): void {
    if (this._eventsBound) return;
    this._eventsBound = true;
    emitter.on(EngineEvents.PRE_RENDER, this._onPreRender);
    emitter.on(EngineEvents.RENDER, this._onRender);
    emitter.on(EngineEvents.POST_RENDER, this._onPostRender);
    emitter.on(EngineEvents.RESIZE, this._onResize);

    // Sync with any resize that happened before we subscribed
    if (Mediator.w && Mediator.h) {
      Renderer.setSize(Mediator.w, Mediator.h);
    }
  }

  private removeEvents(): void {
    if (!this._eventsBound) return;
    this._eventsBound = false;
    emitter.off(EngineEvents.PRE_RENDER, this._onPreRender);
    emitter.off(EngineEvents.RENDER, this._onRender);
    emitter.off(EngineEvents.POST_RENDER, this._onPostRender);
    emitter.off(EngineEvents.RESIZE, this._onResize);
  }

  play(): void {
    Mediator.play();
  }

  pause(): void {
    Mediator.pause();
  }

  get isPlaying(): boolean {
    return Mediator._isPlaying;
  }

  resize(opts: { w: number; h: number }): void {
    Mediator.resize(opts);
  }
}
