import { Component3D } from "../../abstract/component-3d";
import { QuarksComponentData } from "./quarks-data";
import {
  Object3D,
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
  LoaderUtils,
} from "three";
import {
  BatchedRenderer,
  QuarksLoader,
  QuarksUtil,
  ParticleEmitter,
  ParticleSystem,
} from "three.quarks";
import emitter from "../../../internal/engine-emitter";
import { EngineEvents } from "../../../internal/engine-events";
import { AssetResolver } from "../../../internal/assets";

export type { QuarksComponentData } from "./quarks-data";

/**
 * @public
 *
 * Renders a particle effect created with the [three.quarks](https://github.com/Alchemist0823/three.quarks)
 * library. Effects are authored in the [quarks.art](https://quarks.art) visual editor,
 * exported as JSON, and loaded by URL.
 *
 * See {@link QuarksComponentData} for the data schema used to create this component.
 *
 * @example
 * ```ts
 * const fx = await space.components.create({
 *   type: "quarks",
 *   url: "/assets/my-effect.json",
 *   position: { x: 0, y: 1, z: 0 },
 * });
 *
 * fx.pause();
 * fx.play();
 * fx.restart();
 * ```
 */
export class QuarksComponent extends Component3D<QuarksComponentData> {
  //
  private _batchedRenderer: BatchedRenderer = null;

  private _effectRoot: Object3D = null;

  private _loadVersion = 0;

  private _registered = false;

  private _registrationEvent: ((delta: number) => void) | null = null;

  /** @internal */
  mesh: Mesh = null;

  /**
   * @internal
   */
  constructor(opts: any) {
    super(opts);
    this._batchedRenderer = opts.batchedRenderer;
  }

  /** @internal */
  protected async init() {
    if (this.data.url) {
      await this._loadEffect(this.data.url);
    }
  }

  /**
   * Check whether the component is attached to the Three.js Scene.
   * three.quarks ParticleSystem.update() disposes systems whose emitter
   * root parent is not a Scene, so we must defer BatchedRenderer
   * registration until the component is in the scene graph.
   */
  private _isInScene(): boolean {
    let root: Object3D = this;
    while (root.parent) {
      root = root.parent;
    }
    return root.type === "Scene";
  }

  /**
   * Register loaded systems with the shared BatchedRenderer.
   * If the component is already in the scene graph, registers
   * immediately. Otherwise defers to the next LATE_UPDATE frame
   * (by which time the component manager will have added us to the scene).
   */
  private _registerWithBatchRenderer() {
    console.log("[QuarksComponent] _registerWithBatchRenderer called", {
      registered: this._registered,
      hasEffectRoot: !!this._effectRoot,
      hasBatchedRenderer: !!this._batchedRenderer,
    });

    if (this._registered || !this._effectRoot || !this._batchedRenderer) {
      console.log("[QuarksComponent] Skipping registration - missing prerequisites");
      return;
    }

    if (this._isInScene()) {
      console.log("[QuarksComponent] Already in scene, registering immediately");
      this._doRegister();
      return;
    }

    console.log("[QuarksComponent] Not in scene yet, deferring registration");
    // Not in scene yet — defer registration to next frame.
    // Pause all systems so three.quarks doesn't dispose them
    // on the Scene-parent check inside ParticleSystem.update().
    QuarksUtil.pause(this._effectRoot);

    this._registrationEvent = (_delta: number) => {
      if (this.wasDisposed || !this._effectRoot) {
        this._clearRegistrationEvent();
        return;
      }
      if (this._isInScene()) {
        console.log("[QuarksComponent] Now in scene, registering");
        this._doRegister();
        this._clearRegistrationEvent();
      }
    };
    emitter.on(EngineEvents.LATE_UPDATE, this._registrationEvent);
  }

  private _doRegister() {
    if (this._registered || !this._effectRoot || !this._batchedRenderer) {
      return;
    }
    this._registered = true;
    console.log("[QuarksComponent] Adding to BatchedRenderer");
    QuarksUtil.addToBatchRenderer(this._effectRoot, this._batchedRenderer);

    // Resume playback if autoPlay is enabled (systems were paused
    // during deferred registration to survive the Scene-parent check)
    if (this.data.autoPlay !== false) {
      console.log("[QuarksComponent] Playing effect");
      QuarksUtil.play(this._effectRoot);
    }
  }

  private _clearRegistrationEvent() {
    if (this._registrationEvent) {
      emitter.off(EngineEvents.LATE_UPDATE, this._registrationEvent);
      this._registrationEvent = null;
    }
  }

  private async _loadEffect(url: string): Promise<void> {
    const version = ++this._loadVersion;

    return new Promise<void>((resolve) => {
      const loader = new QuarksLoader();
      loader.setCrossOrigin("");

      // Resolve URL and set resourcePath so relative assets (textures) resolve correctly
      const resolvedUrl = AssetResolver.resolve(url, { type: "other" });
      const resourcePath = LoaderUtils.extractUrlBase(resolvedUrl);
      loader.setResourcePath(resourcePath);

      loader.load(
        resolvedUrl,
        (object: Object3D) => {
          if (version !== this._loadVersion || this.wasDisposed) {
            this._disposeObject3D(object);
            resolve();
            return;
          }

          this._effectRoot = object;
          this._registered = false;
          this.add(this._effectRoot);

          this._applyLooping(this.data.looping ?? true);
          this._applySpeed(this.data.speed ?? 1);

          if (this.data.autoPlay === false) {
            QuarksUtil.pause(this._effectRoot);
          }

          this._registerWithBatchRenderer();

          resolve();
        },
        undefined,
        (error: unknown) => {
          if (version !== this._loadVersion || this.wasDisposed) {
            resolve();
            return;
          }
          console.error(
            `[QuarksComponent] Failed to load effect: ${url}`,
            error,
          );
          resolve();
        },
      );
    });
  }

  private _disposeEffect() {
    this._clearRegistrationEvent();

    if (!this._effectRoot) return;

    if (this._registered) {
      this._removeSystems(this._effectRoot);
    }
    this.remove(this._effectRoot);
    this._disposeObject3D(this._effectRoot);
    this._effectRoot = null;
    this._registered = false;
  }

  private _removeSystems(root: Object3D) {
    root.traverse((child) => {
      if (child instanceof ParticleEmitter && child.system) {
        this._batchedRenderer?.deleteSystem(child.system as any);
      }
    });
  }

  private _disposeObject3D(obj: Object3D) {
    obj.traverse((child: any) => {
      if (child instanceof ParticleEmitter && child.system) {
        (child.system as ParticleSystem).dispose();
      }
      child.geometry?.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m: any) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  private _forEachSystem(fn: (system: ParticleSystem) => void) {
    if (!this._effectRoot) return;
    QuarksUtil.runOnAllParticleEmitters(this._effectRoot, (emitter) => {
      if (emitter.system) {
        fn(emitter.system as ParticleSystem);
      }
    });
  }

  private _applySpeed(speed: number) {
    this._forEachSystem((system) => {
      (system as any).speedFactor = speed;
    });
  }

  private _applyLooping(looping: boolean) {
    this._forEachSystem((system) => {
      system.looping = looping;
    });
  }

  /**
   * Start or resume playback of all particle emitters in the effect.
   */
  play() {
    if (this._effectRoot) {
      QuarksUtil.play(this._effectRoot);
    }
  }

  /**
   * Pause all particle emitters in the effect.
   */
  pause() {
    if (this._effectRoot) {
      QuarksUtil.pause(this._effectRoot);
    }
  }

  /**
   * Restart the effect from the beginning.
   */
  restart() {
    if (this._effectRoot) {
      QuarksUtil.restart(this._effectRoot);
    }
  }

  /**
   * Whether any emitter in the effect is currently playing.
   */
  get isPlaying(): boolean {
    let playing = false;
    this._forEachSystem((system) => {
      if (!system.paused) {
        playing = true;
      }
    });
    return playing;
  }

  /**
   * @internal
   */
  async onDataChange(opts: { prev: QuarksComponentData; isProgress: boolean }) {
    const prev = opts.prev;

    if (prev.url !== this.data.url) {
      this._disposeEffect();
      if (this.data.url) {
        await this._loadEffect(this.data.url);
      }
      return;
    }

    if (prev.speed !== this.data.speed) {
      this._applySpeed(this.data.speed ?? 1);
    }

    if (prev.looping !== this.data.looping) {
      this._applyLooping(this.data.looping ?? true);
    }

    if (prev.autoPlay !== this.data.autoPlay) {
      if (this.data.autoPlay === false) {
        this.pause();
      } else {
        this.play();
      }
    }
  }

  /** @internal */
  protected _onCreateCollisionMesh() {
    if (this.mesh == null) {
      this.mesh = new Mesh(
        new BoxGeometry(1, 1, 1),
        new MeshStandardMaterial({ color: "red" }),
      );
      this.add(this.mesh);
      this.mesh.visible = false;
    }
    return this.mesh;
  }

  /**
   * @internal
   */
  getCollisionMesh() {
    if (this.mesh == null) {
      this.mesh = new Mesh(
        new BoxGeometry(1, 1, 1),
        new MeshStandardMaterial({ color: "red" }),
      );
    }

    this.add(this.mesh);
    this.mesh.visible = false;

    return this.mesh;
  }

  /** @internal */
  protected dispose() {
    this._disposeEffect();
    this._batchedRenderer = null;

    if (this.mesh) {
      if (this.mesh.parent) {
        this.mesh.parent.remove(this.mesh);
      }
      this.mesh = null;
    }
  }
}
