import { Engine, Game } from "@oncyberio/engine";
import { EngineEdit } from "@oncyberio/engine-edit";
import SpaceFactory from "@oncyberio/engine/space";
import { deferred } from "./deferred";

export type GameData = Game;

export class StudioEngineFacade {
  //
  public EDITOR_STATES = {
    LOADING: "LOADING",
    READY: "READY",
  };

  private _engine = Engine.getInstance();

  private _spaceLoaded = deferred();

  private canvasContainer?: HTMLElement;

  editor = EngineEdit.getInstance();

  setAutoResize() {
    //
    window.addEventListener("resize", this.resize);
    window.addEventListener("change", this.resize);
    this.resize();
  }

  clearAutoResize() {
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("change", this.resize);
  }

  get Events() {
    return this.editor.Events;
  }

  get Emitter() {
    return this.editor.Emitter;
  }

  get spaceLoaded() {
    return this._spaceLoaded.promise;
  }

  get engine() {
    return this._engine;
  }

  resize = () => {
    if (!this.canvasContainer)
      this.canvasContainer = document.getElementById("canvas-container");
    this._engine?.resize({
      w: this.canvasContainer.clientWidth,
      h: this.canvasContainer.clientHeight,
    });
  };

  private _started = false;

  start = async (opts?: { autoResize?: boolean }) => {
    //
    if (this._started) return;

    const { autoResize = true } = opts ?? {};

    await this.engine.ready;

    if (autoResize) {
      this.setAutoResize();
    }

    this._started = true;

    return this._engine;
  };

  getSpaceUpgrades() {
    //
    if (this.engine == null) throw new Error("Engine not loaded!");

    const components = SpaceFactory.current.components;

    return components._flushUpgrades();
  }

  on(event: string, cb: (...args: any[]) => void) {
    this.editor.Emitter.on(event, cb);

    return () => this.editor.Emitter.off(event, cb);
  }

  once(event: string, cb: (...args: any[]) => void) {
    //
    this.editor.Emitter.once(event, cb);

    return () => this.editor.Emitter.off(event, cb);
  }

  notify(event: string, data: any) {
    this.editor.Emitter.emit(event, data);
  }

  private static _instance: StudioEngineFacade = null;

  static get instance() {
    //
    if (!StudioEngineFacade._instance) {
      //
      StudioEngineFacade._instance = new StudioEngineFacade();
    }

    return StudioEngineFacade._instance;
  }
}
