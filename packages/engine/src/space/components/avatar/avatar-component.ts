// @ts-check

import emitter from "../../../internal/engine-emitter";
import { EngineEvents } from "../../../internal/engine-events";
import {
  Component3D,
  DataChangeOpts,
} from "../../abstract/component-3d";
import { COMPRESSED_SUPPORT } from "../../../internal/constants";
import {
  Box3,
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  Vector3,
  Object3D,
  AnimationMixer,
} from "three";
import AvatarWrapper from "../../../internal/avatar/wrapper";
import { AvatarComponentData } from "./avatar-data";
import type { AvatarFactory } from "../../../internal/avatar";
export type { AvatarComponentData } from "./avatar-data";

import VRMAnimation from "../../../internal/avatar/vrm/animations";

import { RenderMode } from "../../../@types/types";
import { Bone } from "./bones";
import { CALLBACKS } from "../../../internal/avatar/vrm";
import { Assets } from "../../../internal/resources/assets";
import { Color } from "three";
import { VisualPluginRegistry } from "../visual-plugin-registry";


/**
 * @public
 *
 * Component for displaying and controlling VRM avatars in the game.
 * Supports animation playback (GPU or CPU-based), multiple render modes,
 * per-bone access (when using CPU animation), opacity control, LOD optimization,
 * optional text/picture overlays displayed above the avatar, and built-in
 * visual plugins (e.g. rainbow, damage) via {@link AvatarComponentData.plugins}.
 *
 * For more info on VRM files, see {@link https://vrm.dev/en/vrm/vrm_about/ | VRM site}.
 *
 * See {@link AvatarComponentData} for the data schema used to create an avatar component.
 *
 * @example
 * ```ts
 * // Basic avatar creation
 * const avatar = await space.components.create({
 *     type: "avatar",
 *     url: "https://example.com/my-avatar.vrm",
 *     position: { x: 0, y: 0, z: 0 },
 *     rotation: { x: 0, y: 0, z: 0 },
 *     scale: { x: 1, y: 1, z: 1 },
 *     animation: "IDLE",
 *     renderMode: "default",
 *     opacity: 1,
 * });
 *
 * // Advanced: CPU animation mode with bone access and animation control
 * const npc = await space.components.create({
 *     type: "avatar",
 *     url: "https://example.com/npc.vrm",
 *     position: { x: 5, y: 0, z: 3 },
 *     useCpuAnimation: true,         // enable CPU animation for bone access
 *     animation: "IDLE",
 *     renderMode: "toon",
 *     opacity: 0.9,
 *     text: "NPC Guard",
 *     picture: "https://example.com/guard-icon.png",
 * });
 *
 * // Play a walk animation with fade-in
 * npc.play("walk", { fadeIn: 0.3 });
 *
 * // Access a specific bone
 * const headBone = npc.getBone("head");
 *
 * // Register a per-frame mixer callback
 * const dispose = npc.onMixerUpdate(() => {
 *     // runs each animation tick
 * });
 *
 * // Stop the walk animation and revert to idle
 * npc.stop("walk", { fadeOut: 0.3 });
 *
 * // Clean up the mixer callback
 * dispose();
 * ```
 */
export class AvatarComponent extends Component3D<AvatarComponentData> {
  // ── Private fields ──────────────────────────────────────────────────

  private _modeChangeList = [];

  private _updateVRMPromise: any = null;

  private _avatar: AvatarWrapper = null;

  private _visible: boolean = false;

  private _updateEvent: any = null;

  private _factory: AvatarFactory = null;

  private _currentUrl: string = null;

  private _renderMode: RenderMode = null;

  /**
   * @internal
   */
  _collisionMesh = null;

  // ── Constructor & internal lifecycle ─────────────────────────────────

  /**
   * @internal
   */
  constructor(opts) {
    //
    super(opts);

    this.rotation.order = "YXZ";

    this._factory = opts.avatarFactory;

    // samsy - we need to listen to the animation list updated event
    // is there another way

    VRMAnimation.on("setAnimationJSON", this._animationListUpdated);
  }

  /** @internal */
  protected async init() {
    //
    this._currentUrl = this._getUrl();

    this._renderMode = this.data.renderMode;

    const runtime = this.space.options?.runtime ?? "web";

    let plugins = [];
    if (runtime === "web") {
      const { resolvePlugins } = await import(
        "../../../internal/rendering/libraries/resolve-plugins"
      );
      plugins = resolvePlugins(this.data.plugins);
    }

    this._avatar = await this._factory.get(this._currentUrl, {
      ...this.data,
      plugins,
    });

    if (this.wasDisposed) return;

    this._avatar.attachTo(this);

    // seems scale is incorrect at this point, but get corrected in _onUpdate
    // but _onUpdate is not fired on the server
    // force correcrt scale
    this._avatar.updateFromSource();

    this.visible = true;

    this._updateSettings();
  }

  /**
   * @internal
   */
  onDataChange(opts: DataChangeOpts<AvatarComponentData>): void {
    //

    // Live-update plugin uniforms when only parameters changed
    if (opts.prev?.plugins != this.data.plugins) {
      if (this._isSamePluginStructure(opts.prev?.plugins, this.data.plugins)) {
        this._liveUpdatePluginUniforms();
        return;
      }
      // structural plugin change: skip during drag, rebuild on release
      if (opts.isProgress) return;

      const rt = this.space.options?.runtime ?? "web";
      const updatePlugins = async () => {
        let plugins = [];
        if (rt === "web") {
          const { resolvePlugins } = await import(
            "../../../internal/rendering/libraries/resolve-plugins"
          );
          plugins = resolvePlugins(this.data.plugins);
        }
        await this._avatar.updateVRM(this._currentUrl, { plugins });
        if (this._avatar) {
          this._updateSettings();
        }
      };
      updatePlugins();
      return;
    }

    if (opts.isProgress) return;

    if (opts.prev.url !== this.data.url) {
      //
      this._updateVRM(this.data.url);
    }

    if (opts.prev.renderMode !== this.data.renderMode) {
      //
      this._updateRenderMode(this.data.renderMode);
    }

    if (opts.prev?.useCpuAnimation != this.data.useCpuAnimation) {
      //
      this._updateAnimationMode(this.data.useCpuAnimation);
    }

    if (opts.prev?.animation != this.data.animation) {
      //
      this._setAnimation(this.data.animation);
    }

    this._updateSettings();
  }

  /** @internal */
  private _isSamePluginStructure(prev: any, current: any): boolean {
    if (!prev || !current) return false;
    if (!Array.isArray(prev) || !Array.isArray(current)) return false;
    if (prev.length !== current.length) return false;
    for (let i = 0; i < prev.length; i++) {
      if (prev[i]?.id !== current[i]?.id) return false;
    }
    return true;
  }

  /** @internal */
  private _liveUpdatePluginUniforms() {
    if (!this._avatar || !this.data.plugins) return;

    const uniformUpdates: Record<string, any> = {};
    for (const descriptor of this.data.plugins as any[]) {
      const Cls = VisualPluginRegistry.get(descriptor.id);
      if (!Cls) continue;

      const plugin = new Cls(descriptor);
      if (!plugin.uniforms) continue;

      for (const [name, uniform] of Object.entries(plugin.uniforms)) {
        uniformUpdates[name] = (uniform as any).value;
      }
    }

    // VRM meshes live in the vrm wrapper, not as children of this component.
    // Baked (instanced): meshes are in wrapper.gltf (an Object3D)
    // Mixer (non-instanced): meshes are in wrapper.vrm (the scene Object3D)
    const wrapper = (this._avatar as any)?.vrm;
    if (!wrapper) return;

    const roots: any[] = [];
    if (wrapper.gltf?.traverse) roots.push(wrapper.gltf);
    if (wrapper.isCpuAnimation && wrapper.vrm?.traverse) roots.push(wrapper.vrm);

    const updateChild = (child: any) => {
      if (!child.isMesh || !child.material?.uniforms) return;

      for (const [name, value] of Object.entries(uniformUpdates)) {
        const existing = child.material.uniforms[name];
        if (!existing) continue;

        if (value instanceof Color && existing.value instanceof Color) {
          existing.value.copy(value);
        } else {
          existing.value = value;
        }
      }
    };

    for (const root of roots) {
      root.traverse(updateChild);
    }
  }


  /**
   * @internal
   */
  getRawBBox(target = new Box3()) {
    //
    target.copy(this._avatar.vrm.vrmBBox);

    // target.min.multiplyScalar(this._avatar.vrm.vrmScale);

    // target.max.multiplyScalar(this._avatar.vrm.vrmScale);

    target.applyMatrix4(this.matrixWorld);

    target.min.divide(this._avatar.vrm.scale);

    target.max.divide(this._avatar.vrm.scale);

    return target;
  }

  /** @internal */
  protected dispose() {
    //
    this._removeEvents();

    VRMAnimation.off("setAnimationJSON", this._animationListUpdated);

    try {
      if (this._avatar == null) {
        return;
      }

      this._avatar.dispose();

      this._avatar = null;
    } catch (e) {
      console.error(e);
    }
  }

  // ── Private methods ─────────────────────────────────────────────────

  private _getUrl() {
    //
    const url =
      COMPRESSED_SUPPORT && this.data.urlCompressed
        ? this.data.urlCompressed
        : this.data.url;

    return url || Assets.vrms.sunshine;
  }

  private _updateSettings() {
    if (!this._avatar) return;
    //
    this._avatar.text = this.data.text;

    this._avatar.vrm.ignoreLOD = this.data.ignoreLOD;

    if (this._collisionMesh != null) {
      //
      const dims = this.getDimensions();

      dims.divide(this.scale);

      this._collisionMesh.scale.copy(dims);
    }

    this._avatar.vrm.opacity = this.data.opacity;

    this._avatar.setTextPosition();
  }

  private _setAnimation(value) {
    if (value === null) {
      value = "idle";
    }

    this._avatar?.vrm.setAnimation(value);
  }

  // prevZ = 0;

  private _onUpdate() {
    const scale = this._avatar.vrm.vrmScale;

    this._avatar.updateFromSource();

    // if (window.isMoving) {
    //     const dz = this.position.y - this.prevZ;
    //     console.log("avatar dy", dz, this.position.y.toFixed(2));
    //     // console.log("avatar pos", this.position);
    //     this.prevZ = this.position.y;
    // }

    if (this.rigidBody == null) return;

    if (this._avatar.vrm.vrmScale != scale) {
      const dims = this.getDimensions();

      this.rigidBody.colliders.forEach((c) => c.setScale(dims));
    }
  }

  private _addEvents() {
    if (this._updateEvent == null) {
      this._updateEvent = this._onUpdate.bind(this);

      emitter.on(EngineEvents.LATE_UPDATE, this._updateEvent);
    }
  }

  private _removeEvents() {
    if (this._updateEvent != null) {
      emitter.off(EngineEvents.LATE_UPDATE, this._updateEvent);

      this._updateEvent = null;
    }
  }

  protected _getBBoxImp(target: Box3) {
    //
    target.copy(this._avatar.vrm.vrmBBox);

    // target.min.multiplyScalar(this._avatar.vrm.vrmScale);
    // target.max.multiplyScalar(this._avatar.vrm.vrmScale);

    target.min.add(this.positionWorld);
    target.max.add(this.positionWorld);

    return target;
  }

  protected _onCreateCollisionMesh() {
    //
    //if (this.userData.opts?.transient) return null;

    const geometry = new BoxGeometry(1, 1, 1);

    geometry.translate(0, 0.5, 0);

    const mesh = new Mesh(
      geometry,
      new MeshBasicMaterial({
        wireframe: true,
      }),
    );

    const dims = this.getDimensions();

    dims.divide(this.scale);

    mesh.scale.copy(dims);

    mesh.name = "PLAYER";

    mesh.visible = false;

    this.add(mesh);

    this._collisionMesh = mesh;

    return mesh;
  }

  private async _updateVRM(url, data: any = {}) {
    // debugger;
    if (data.urlCompressed) {
      //
      url = this._getUrl();
    }
    if (
      this._currentUrl === url &&
      (data.renderMode == null || data.renderMode == this._renderMode)
    ) {
      return;
    }

    if (data.renderMode == null && this._currentUrl != url) {
      this._currentUrl = url;

      await this._avatar.updateVRM(url, data);
    } else if (data.renderMode != this._renderMode) {
      await this._updateRenderMode(data.renderMode);
    }
  }

  private async _updateRenderMode(mode: RenderMode) {
    await this._avatar.updateVRM(this._currentUrl, { renderMode: mode });
    this._renderMode = mode;
    this._updateSettings();
  }

  /**
   * Switches between GPU and CPU animation modes. If another VRM update is
   * already in progress, the mode change is queued and applied after the
   * current update completes. The previously playing animation is restored
   * after the mode switch.
   *
   * @param cpuMode - `true` for CPU-based animation (AnimationMixer), `false` for GPU animation.
   */
  private async _updateAnimationMode(cpuMode: boolean) {
    //
    if (this._updateVRMPromise != null) {
      console.log("mode is alreay loading.. trying to call : ", cpuMode);

      this._modeChangeList.push(cpuMode);

      return;
    }
    const previousAnimation = this.data.animation;

    this._updateVRMPromise = this._avatar.updateVRM(this._currentUrl, {
      useCpuAnimation: cpuMode,
    });

    await this._updateVRMPromise;

    this._updateVRMPromise = null;

    if (this._modeChangeList.length > 0) {
      const mode = this._modeChangeList.pop();

      this._modeChangeList = [];

      await this._avatar.updateVRM(this._currentUrl, { useCpuAnimation: mode });
    }

    this._setAnimation(previousAnimation); // we need to set the animation again

    this._updateSettings();
  }

  /**
   * this is triggered when the animation list is updated
   * we need to check if the animation still exists in the list
   * if not we need to override it to idle
   */
  private _animationListUpdated = (list) => {
    let i = 0;

    const currentAnim = this.data.animation;

    if (currentAnim == null) return;

    let exists = false;

    while (i < list.length) {
      if (list[i].name.toLowerCase() === currentAnim.toLowerCase()) {
        exists = true;
        break;
      }

      i++;
    }

    if (exists == false) {
      this.setData({ animation: "idle" });
    } else if (this._avatar?.vrm) {
      // Re-apply current animation so CPU/GPU wrappers can refresh their clip/bake
      // bindings when the global animation set changes under the same name.
      this._setAnimation(currentAnim);
    }
  };

  private _fetchAddedComponents(meshes, mapMesh) {
    meshes.traverse((child) => {
      // high quality meshes have skeletons..
      if (child.skeleton != null) {
        for (let i = 0; i < child.skeleton.bones.length; i++) {
          const bone = child.skeleton.bones[i];
          let c = 0;

          while (c < bone.children.length) {
            const child2 = bone.children[c];

            if (child2.isBone != true) {
              if (mapMesh[bone.name] == null) {
                mapMesh[bone.name] = [];
              }

              mapMesh[bone.name].push(child2);
            }

            c++;
          }
        }
      }
    });
  }

  private _retrieveAddedComponents(meshes, mapMesh) {
    const keys = Object.keys(mapMesh);

    if (keys.length > 0) {
      let i = 0;

      while (i < keys.length) {
        const content = mapMesh[keys[i]];

        meshes.traverse((child) => {
          if (child.name === keys[i]) {
            let c = 0;

            while (c < content.length) {
              child.add(content[c]);

              c++;
            }
          }
        });

        i++;
      }
    }
  }

  // ── Public API ──────────────────────────────────────────────────────

  /**
   * Sets the uniform scale of the avatar, applying the same value to x, y, and z.
   *
   * @param scale - The uniform scale value to apply.
   */
  set avatarScale(scale) {
    this.scale.set(scale, scale, scale);

    this._updateSettings();
  }

  /**
   * get the scale of the avatar vrm
   */
  get avatarScale() {
    return this.scale.x;
  }

  /**
   * See {@link https://threejs.org/docs/index.html?q=objec#api/en/core/Object3D.visible | Threejs doc}
   */
  // @ts-ignore
  set visible(value) {
    this._visible = value;

    if (this._avatar) {
      this._avatar.visible = value;

      if (value == true) {
        this._addEvents();
      } else {
        this._removeEvents();
      }
    }
  }

  /**
   * See {@link https://threejs.org/docs/index.html?q=objec#api/en/core/Object3D.visible | Threejs doc}
   */
  get visible() {
    return this._visible;
  }

  get vrmUrl() {
    return this._currentUrl;
  }

  getDimensions() {
    const vrmSize = this._avatar.vrm.vrmSize;

    const height = vrmSize.y * this._avatar.vrm.absoluteScale;

    const diameter = vrmSize.x * this._avatar.vrm.absoluteScale * 0.5;

    return new Vector3(diameter, height, diameter);
  }

  /**
   * Computes a bounding box based on current bone world positions.
   * This accounts for animation state, unlike the static vrmBBox.
   *
   * Requires {@link AvatarComponentData.useCpuAnimation} to be `true` (CPU animation mode).
   * Falls back to static bbox if bones are not available.
   *
   * @param target - Optional Box3 to store the result. Creates a new Box3 if not provided.
   * @param padding - Optional padding to add around bone positions (default: 0.1)
   * @returns The computed bounding box in world space.
   */
  getAnimatedBBox(target = new Box3(), padding = 0.1): Box3 {
    // If not using mixer mode, fall back to static bbox
    if (!this.data.useCpuAnimation || !this._avatar?.vrm?.gltf?.userData?.vrmHumanoid) {
      return this.getBBox(target);
    }

    const humanoid = this._avatar.vrm.gltf.userData.vrmHumanoid;
    const tempVec = new Vector3();

    target.makeEmpty();

    // List of humanoid bones to check
    const boneNames = [
      "hips",
      "spine",
      "chest",
      "upperChest",
      "neck",
      "head",
      "leftShoulder",
      "leftUpperArm",
      "leftLowerArm",
      "leftHand",
      "rightShoulder",
      "rightUpperArm",
      "rightLowerArm",
      "rightHand",
      "leftUpperLeg",
      "leftLowerLeg",
      "leftFoot",
      "rightUpperLeg",
      "rightLowerLeg",
      "rightFoot",
    ];

    for (const boneName of boneNames) {
      const bone = humanoid.getNormalizedBoneNode(boneName);
      if (bone) {
        bone.getWorldPosition(tempVec);
        target.expandByPoint(tempVec);
      }
    }

    // Add padding to account for mesh around bones
    target.expandByScalar(padding * this._avatar.vrm.vrmScale);

    return target;
  }

  /**
   * Computes dimensions based on the current animated bounding box.
   * This accounts for animation state, unlike the static {@link getDimensions}.
   *
   * Requires {@link AvatarComponentData.useCpuAnimation} to be `true` (CPU animation mode).
   * Falls back to static dimensions if bones are not available.
   *
   * @param target - Optional Vector3 to store the result. Creates a new Vector3 if not provided.
   * @param padding - Optional padding passed to {@link getAnimatedBBox} (default: 0.1)
   * @returns A Vector3 containing (diameter, height, diameter) based on animated bounds.
   */
  getAnimatedDimensions(target = new Vector3(), padding = 0.1): Vector3 {
    const bbox = this.getAnimatedBBox(new Box3(), padding);
    bbox.getSize(target);

    const height = target.y;
    const diameter = Math.max(target.x, target.z);

    return target.set(diameter, height, diameter);
  }

  /**
   * Plays a named animation on the avatar. Requires {@link AvatarComponentData.useCpuAnimation}
   * to be `true` (CPU animation mode). Logs an error if GPU animation mode is active.
   *
   * Also updates the component's `animation` data to the given name.
   *
   * @param name - The name of the animation to play (e.g. `"walk"`, `"run"`, `"idle"`).
   * @param opts - Animation playback options.
   * @param opts.fadeIn - Fade-in duration in seconds (default: 0).
   * @param opts.stopAll - If true, stops all other animations before playing (default: false).
   * @param opts.speed - Playback speed multiplier (default: 1).
   * @param opts.loop - Loop mode: `"once"` (play once), `"repeat"` (loop forever), or `"pingpong"` (alternate direction).
   * @param opts.repetitions - Number of repetitions when looping (default: Infinity).
   * @param opts.clampWhenFinished - If true, animation stays at last frame when finished (default: false).
   * @param opts.timeScale - Time scale for the animation (default: 1).
   * @param opts.weight - Blend weight for the animation (default: 1).
   * @param opts.reset - If true, resets the animation even if already playing (default: false).
   * @param opts.callback - Callback fired on animation events. Receives `{ type: "loop" | "finished", action }`.
   *
   * @example
   * ```ts
   * // Play a looping walk animation
   * avatar.play("walk", { fadeIn: 0.3, loop: "repeat" });
   *
   * // Play a one-shot jump animation with callback
   * avatar.play("jump", {
   *   loop: "once",
   *   callback: (e) => {
   *     if (e.type === "finished") {
   *       console.log("Jump animation finished");
   *     }
   *   }
   * });
   * ```
   */
  play(
    name: string,
    opts?: {
      fadeIn?: number;
      stopAll?: boolean;
      speed?: number;
      loop?: "once" | "repeat" | "pingpong";
      repetitions?: number;
      clampWhenFinished?: boolean;
      timeScale?: number;
      weight?: number;
      reset?: boolean;
      callback?: (event: { type: "loop" | "finished" }) => void;
    },
  ) {
    if (this.data.useCpuAnimation == false) {
      console.error("not supported with gpu animations");
      return;
    }

    this._avatar?.vrm.playAnimation(name, opts);

    this.setData({ animation: name });
  }

  /**
   * Stops a named animation on the avatar. Requires {@link AvatarComponentData.useCpuAnimation}
   * to be `true` (CPU animation mode). If the stopped animation is the current default
   * animation, the component reverts to `"idle"`.
   *
   * @param name - The name of the animation to stop.
   * @param opts - Options for stopping the animation.
   * @param opts.fadeOut - Optional fade-out duration in seconds.
   */
  stop(
    name: string,
    opts: {
      fadeOut?: number;
    },
  ) {
    if (this.data.useCpuAnimation == false) {
      console.error("not supported with gpu animations");
      return;
    }

    this._avatar?.vrm.stopAnimation(name, opts);

    if (this.data.animation == name) {
      this.setData({ animation: "idle" });
    }
  }

  /**
   * Returns the currently active animations on the avatar's VRM model.
   * Only meaningful when {@link AvatarComponentData.useCpuAnimation} is `true`.
   */
  get activeAnimations() {
    return this._avatar?.vrm.activeAnimations;
  }

  /**
   * Stops all currently playing animations on the avatar.
   * Requires {@link AvatarComponentData.useCpuAnimation} to be `true` (CPU animation mode).
   */
  stopAll() {
    if (this.data.useCpuAnimation == false) {
      console.error("not supported with gpu animations");
      return;
    }

    this._avatar?.vrm.stopAll();
  }

  /**
   * Returns the Three.js Object3D node for a specific VRM humanoid bone.
   * Requires {@link AvatarComponentData.useCpuAnimation} to be `true` (CPU animation mode).
   *
   * @param id - The bone identifier from the VRM humanoid bone set (e.g. `"head"`, `"leftHand"`).
   * @returns The Object3D node for the specified bone.
   * @throws Error if `useCpuAnimation` is `false` (GPU animation mode does not support bone access).
   */
  getBone(id: Bone) {
    if (!this.data.useCpuAnimation)
      throw new Error(
        "Cannot use bones with GPU avatars, disable the GPU option or enable useCpuAnimation",
      );
    return this._avatar?.vrm?.gltf?.userData?.vrmHumanoid?.getNormalizedBoneNode?.(
      id,
    ) as Object3D;
  }

  /**
   * Registers a callback to be invoked on each animation mixer update tick.
   * Requires {@link AvatarComponentData.useCpuAnimation} to be `true` (CPU animation mode).
   *
   * @param f - Callback function invoked on each mixer update.
   * @returns A dispose function that, when called, unregisters the callback.
   * @throws Error if `useCpuAnimation` is `false`.
   */
  onMixerUpdate(f: () => void) {
    if (!this.data.useCpuAnimation)
      throw new Error(
        "useCpuAnimation is disabled, enable it or disable the GPU option",
      );
    const mixer = this._avatar.vrm.gltf.scene.mixer;
    mixer[CALLBACKS] ??= [];
    mixer[CALLBACKS].push(f);
    return () => mixer[CALLBACKS].splice(mixer[CALLBACKS].indexOf(f), 1);
  }
}
