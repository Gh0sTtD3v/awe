// @ts-check

import { perfs } from "./internal/utils/perf";
import {
  CANVAS,
  SET_EDIT_MODE,
  SET_SERVER_MODE,
} from "./internal/constants";
import type { WorldAdapter } from "./internal/world";
import type { Space } from "./space/space";
import SpaceFactory from "./space/space-factory";
import type {
  EnterSpaceOpts,
  EngineSessionState,
  UserData,
  CreateSpaceResult,
  RuntimeProfile,
} from "./@types/enter-space-opts";
import {
  AssetResolver,
  configureDefaultLoadingManager,
} from "./internal/assets";
import engineEmitter from "./internal/engine-emitter";
import { EngineEvents } from "./internal/engine-events";

const DEMO_USER: UserData = {
  id: "demo",
  name: "Demo User",
};

export class Engine {
  canvas: HTMLCanvasElement = null;
  ready: Promise<void>;
  protected _resolveReady: () => void;
  protected _world: WorldAdapter | null = null;
  protected _runtime: RuntimeProfile = "web";
  protected _sessionState: EngineSessionState = "void";
  private _currentAbort: AbortController | null = null;

  constructor() {
    this.ready = new Promise((resolve) => {
      this._resolveReady = resolve;
    });
    this.canvas = CANVAS;
    perfs.mark("boot");

    // Configure DefaultLoadingManager for early asset loads
    configureDefaultLoadingManager();

    // Listen for space destruction requests
    engineEmitter.on(
      EngineEvents.SPACE_DESTROY_REQUESTED,
      this._handleSpaceDestroy,
    );
  }

  play() {
    this._world?.play();
  }

  pause() {
    this._world?.pause();
  }

  get isPlaying() {
    return this._world?.isPlaying ?? false;
  }

  async resize(opts = { w: 1024, h: 1024 }) {
    this._world?.resize(opts);
  }

  showIntro() {
    if (this._runtime !== "web") {
      return Promise.resolve();
    }

    this.play();
    return this._world?.showIntro?.() ?? Promise.resolve();
  }

  hideIntro() {
    if (this._runtime !== "web") {
      return Promise.resolve();
    }

    return this._world?.hideIntro?.() ?? Promise.resolve();
  }

  setEditMode(val: boolean) {
    //
    SET_EDIT_MODE(val);
  }

  setServerMode(val: boolean) {
    //
    SET_SERVER_MODE(val);
  }

  onError(cb: (err: Error) => void) {
    engineEmitter.onError(cb);
  }

  offError(cb: (err: Error) => void) {
    engineEmitter.offError(cb);
  }

  get sessionState(): EngineSessionState {
    return this._sessionState;
  }

  private get world(): WorldAdapter {
    if (!this._world) {
      throw new Error("World is not initialized.");
    }

    return this._world;
  }

  protected async _ensureWorld(runtime: RuntimeProfile): Promise<void> {
    if (this._world && this._runtime === runtime) {
      await this.ready;
      return;
    }

    if (this._world) {
      await this._world.dispose();
      this._world = null;
      this._runtime = runtime;
    }

    const { WorldWeb } = await import("./internal/world-web");
    this._world = new WorldWeb();
    this._runtime = runtime;
    await this._world.preload();

    this._resolveReady();
  }

  /**
   * Create and load a space, returning it along with a reveal function.
   *
   * The reveal function allows you to control when the intro animation
   * fades out. This gives you time to set up the camera, controls, and
   * other game state before the player sees the scene.
   *
   * @example
   * ```ts
   * const { space, reveal } = await engine.createSpace(opts);
   *
   * // Set up camera, controls, etc. before revealing
   * const player = space.components.byId("player");
   * initializeCamera(player);
   * setupControls(player);
   *
   * // Now reveal the scene to the player
   * await reveal();
   *
   * space.use({
   *   onUpdate: (dt) => { player.position.x += dt; },
   * });
   *
   * space.start();
   *
   * // Later, clean up:
   * space.destroy();
   * ```
   */
  async createSpace(opts: EnterSpaceOpts): Promise<CreateSpaceResult> {
    if (this._sessionState !== "void") {
      throw new Error("Destroy the current space before creating a new one.");
    }

    // Fill in defaults at the engine boundary so downstream modules
    // always see fully resolved opts.
    opts.runtime ??= "web";
    opts.mode ??= "game";

    const isEditMode = opts.mode === "edit";
    const runtime = opts.runtime;

    const abort = (this._currentAbort = new AbortController());
    const signal = abort.signal;

    this._sessionState = "loading";

    // Configure asset resolver before loading any assets
    if (opts.assets) {
      AssetResolver.configure(opts.assets);
    }

    // Reconfigure LoadingManager with updated AssetResolver settings
    configureDefaultLoadingManager();

    await this._ensureWorld(runtime);
    if (signal.aborted) return null;

    this.play();
    if (signal.aborted) return null;

    // Game mode: user handling
    if (!isEditMode) {
      const user = opts.userReady
        ? await opts.userReady
        : (opts.user ?? DEMO_USER);

      if (signal.aborted) return null;
    }

    this.setEditMode(isEditMode);

    await this.showIntro();
    if (signal.aborted) return null;

    const game = {
      id: opts.game.id,
      components: opts.game.components,
      creatorId: opts.game.creatorId,
      editors: opts.game.editors,
    };

    const space = await this.world.createSpace({
      game,
      externalApi: opts.externalApi ?? {},
      loadOpts: {},
      hot: opts.hot,
      chunked: opts.chunked,
      runtime,
    });

    if (signal.aborted) return null;

    // Emit ready events so space lifecycle is initialized
    engineEmitter.emit(EngineEvents.GAME_READY);
    engineEmitter.emit(EngineEvents.GAME_POST_READY);

    this._sessionState = isEditMode ? "studio" : "game";

    if (abort === this._currentAbort) {
      this._currentAbort = null;
    }

    // Wait for the space to be fully ready
    await space.ready;

    // Track whether reveal has been called
    let revealed = false;

    const reveal = async (): Promise<void> => {
      if (revealed) return;
      revealed = true;
      await this.hideIntro();
    };

    return { space, reveal };
  }

  /** Hook for subclass cleanup when a space is destroyed. */
  protected _onSpaceCleanup(): void {}

  /**
   * @internal
   * Handle space destruction triggered by space.destroy()
   */
  private _handleSpaceDestroy = async (space: Space) => {
    if (this._sessionState === "void") {
      return;
    }

    // Verify this is the current space
    if (SpaceFactory.current !== space) {
      return;
    }

    this._currentAbort?.abort();
    this._currentAbort = null;

    if (this._world) {
      await this._world.destroyCurrentSpace();
    }

    // Reset asset resolver to default state
    AssetResolver.reset();

    // Reconfigure LoadingManager after AssetResolver reset
    configureDefaultLoadingManager();

    this.setEditMode(false);

    await this.pause();

    this._onSpaceCleanup();

    this._sessionState = "void";
  };

  private static instance: Engine = null;

  static getInstance() {
    if (!Engine.instance) {
      Engine.instance = new Engine();
    }

    return Engine.instance;
  }
}
