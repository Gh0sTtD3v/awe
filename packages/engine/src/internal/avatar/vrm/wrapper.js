import { Vector3, Box3, LoopOnce, LoopPingPong, LoopRepeat } from "three";

import Animations from "./animations";

import VRMMesh from "./mesh";

const tempVec = new Vector3();

import { MINIMUM_MIX_RATIO } from "../../constants";

const _hipstemp = new Vector3();

const _spinetemp = new Vector3();

const _box3 = new Box3();

import Mix from "../../utils/math/mix";

import Shared from "../../utils/globals/shared";

import { VRMSpringBoneColliderShapeCapsule } from "@pixiv/three-vrm-springbone";

export default class AnimatedWrapper {
  constructor(meshes, opts = {}) {
    this.data = opts.data;

    this.factory = opts.factory;

    this.isLOD = false;

    this.plugins = opts.pluginString;

    this.main = this.data.main == true;

    this.ignoreLOD = this.data.ignoreLOD == true || this.main;

    if (this.main) {
      globalThis.mainWrapper = this;
    }

    this.textureIndex = -1;

    this.runThresholdCount = 0;

    this.runThresholdCountMax = 0.5;

    this.picture = opts.picture;

    this._url = null;

    this.url = this.picture?.url;

    this._atlas = { x: 1, y: 1, z: 0, w: 0 };

    this.usePFPs = null;

    this.headPosition = new Vector3();

    this.originalHeadPosition = new Vector3();

    this.originalHipPosition = new Vector3();

    this.originalSpinePosition = new Vector3();

    this.hipPosition = new Vector3();

    this.legPosition = new Vector3();

    this.spinePosition = new Vector3();

    // this.originalVRMName = opts.name;

    this.isCpuAnimation = meshes.isCpuAnimation == true;

    this.highQualityMeshes = null;

    this.firstFrame = true;

    this.actionConfirmation = 0;

    this._position = new Vector3();

    this._opacity = 1;

    this._rotation = 0;

    this._color = null;

    this._visible = true;

    this.floorVelocity = 0;

    this.lastFloorVelocityPosition = new Vector3();

    this.smoothedFloorVelocity = 0;

    this.currentAnimationIndex = 0;

    this.currentAction = null;

    this.lastAction = null;

    this.onFloor = true;

    this.isJumping = false;

    this.currentEmote = null;

    this.emoteResolve = null;

    this.isSitting = false;

    this.outOfFloorAttempt = -1;

    this.now = Date.now();

    this._animations = [0, 0, 0, 0];

    this._scale = new Vector3(1, 1, 1);

    this.baseScaleRatio = 1;

    this.updateVRM(meshes, true);

    this.prevScaleVal = null;

    if (this.data.animation) {
      this.setAnimation(this.data.animation);
    }

    if (this.data.scale) {
      this.setScale(this.data.scale.x);
    }

    if (this.data.position) {
      this.position = this.data.position;
    }

    this.activeAnimations = {};
  }

  updateVRM(meshes, first = false) {
    if (this.isCpuAnimation && this.vrm) {
      this.vrm.visible = false;

      if (this.highQualityMeshes) {
        if (this.highQualityMeshes.mixer) {
          this.highQualityMeshes.mixer.stopAllAction();
        }
      }
    }

    try {
      this.vrmName = meshes.name;
    } catch (e) {
      debugger;
    }

    // console.log('meshes 2 ', this.vrmName)

    // debugger;

    this.gltf = meshes;

    this.usePFPs = meshes.pfpOptions;

    this.isCpuAnimation = meshes.isCpuAnimation == true;

    this.highQualityMeshes = null;

    if (this.isCpuAnimation) {
      this.vrm = meshes.scene;

      this.highQualityMeshes = meshes.scene;

      this.vrm.visible = this.visible;

      if (this.currentAction != null) {
        // reset current action to play again

        const action = this.currentAction;

        this.currentAction = null;

        this.setCurrentAction(action, true);
      }

      this.isVersion0 = meshes.userData.vrm.meta.metaVersion == "0";

      this.baseScaleRatio = this.gltf.userData.vrm.baseScaleRatio;

      // this.absoluteRatio = this.gltf.userData.vrm.absoluteRatio;

      this.vrmBBox = this.gltf.userData.vrm.vbbox;

      this.vrmSize = this.gltf.userData.vrm.vbbox.getSize(new Vector3());

      meshes.userData.vrm.humanoid
        ?.getNormalizedBoneNode("hips")
        .getWorldPosition(_hipstemp);

      meshes.userData.vrm.humanoid
        ?.getNormalizedBoneNode("spine")
        .getWorldPosition(_spinetemp);

      this.hipPosition.copy(_hipstemp);

      this.spinePosition.copy(_spinetemp);

      _box3.setFromObject(this.gltf.scene);
    } else {
      this.vrm = [];

      this.metaIds = [];

      if (meshes.animationsVersion == null) {
        meshes.animationsVersion = Animations.version;
      }

      let i = 0;

      while (i < meshes.children.length) {
        const mesh = meshes.children[i];

        this.vrm.push(mesh.gltf.userData);

        this.metaIds.push(mesh.bakeMeta.ids);

        this.hipPosition.copy(mesh.bakeMeta.extras["SITTING"].hipsPosition);

        this.spinePosition.copy(mesh.bakeMeta.extras["SITTING"].spinePosition);

        i++;
      }

      this.isVersion0 = this.vrm[0].vrmMeta.metaVersion == "0";

      this.baseScaleRatio = this.vrm[0].vrm.baseScaleRatio;

      // this.absoluteRatio = this.vrm[0].vrm.absoluteRatio;

      this.vrmBBox = this.vrm[0].vrm.vbbox;

      this.vrmSize = this.vrm[0].vrm.vbbox.getSize(new Vector3());

      _box3.setFromObject(meshes);
    }

    this.headPosition.set(0.55 * 2, _box3.max.y - _box3.min.y, 0.55 * 2);

    this.originalHeadPosition.copy(this.headPosition);

    this.originalHipPosition.copy(this.hipPosition);

    this.originalSpinePosition.copy(this.spinePosition);

    this.headPosition.y *= this._scale.y * this.baseScaleRatio;

    if (this.isLOD == false) {
      this.nonLODVRMSize = this.vrmSize;
    }

    if (first) {
      this.setScale(this.baseScaleRatio);
    } else if (this.prevScaleVal != null) {
      this.setScale(this.prevScaleVal, true);
    }
  }

  setScale(val, force = false) {
    if (this.prevScaleVal == val && force == false) {
      return;
    }

    var scaleLODRatio = 1;

    if (this.isLOD == true) {
      scaleLODRatio = this.nonLODVRMSize.y / this.vrmSize.y;
    } else {
      this.prevScaleVal = val;
    }

    // val == current scale
    // scaleLODRatio == correction scale for the LOD display
    // this.baseScaleRatio == base scale ratio for the VRM
    const mixedScale = val * scaleLODRatio * this.baseScaleRatio;

    this._scale.set(mixedScale, mixedScale, mixedScale);

    this.headPosition.copy(this.originalHeadPosition);

    this.hipPosition.copy(this.originalHipPosition);

    this.spinePosition.copy(this.originalSpinePosition);

    this.vrmScale = this._scale.x;

    this.absoluteScale = val * scaleLODRatio;

    // Mix(MINIMUM_MIX_RATIO, 1, this._scale.x) * this.baseScaleRatio ;

    this.headPosition.y *= this.vrmScale;

    this.spinePosition.y *= this.vrmScale;

    this.hipPosition.y *= this.vrmScale;

    if (this.isCpuAnimation) {
      const scale = this.vrmScale;

      this.hipPosition.copy(this.originalHipPosition);

      this.spinePosition.copy(this.originalSpinePosition);

      this.spinePosition.setScalar(0.5 * scale);

      this.hipPosition.setScalar(0.5 * scale);

      this.highQualityMeshes.scale.setScalar(scale);

      if (this.gltf.userData.vrm.springBoneManager != null) {
        // scale joints
        for (const joint of this.gltf.userData.vrm.springBoneManager.joints) {
          if (joint.settings.originalSiftness == null) {
            joint.settings.originalSiftness = joint.settings.stiffness;
            joint.settings.originalHitRadius = joint.settings.hitRadius;
          }

          joint.settings.stiffness = joint.settings.originalSiftness * scale;
          joint.settings.hitRadius = joint.settings.originalHitRadius * scale;
        }

        // scale colliders
        for (const collider of this.gltf.userData.vrm.springBoneManager
          .colliders) {
          const shape = collider.shape;
          const offset = collider.offset;

          if (shape.originalRadius == null) {
            shape.originalRadius = shape.radius;
          }

          shape.radius = shape.originalRadius * scale;

          if (offset != null) {
            if (collider.originalOffset == null) {
              collider.originalOffset = offset.clone();
            }

            collider.offset.copy(shape.originalOffset);

            collider.offset.multiplyScalar(scale);
          }

          if (shape instanceof VRMSpringBoneColliderShapeCapsule) {
            if (shape.originalTail == null) {
              shape.originalTail = shape.tail.clone();
            }

            shape.tail.copy(shape.originalTail).multiplyScalar(scale);
          }
        }
      }
    }
  }

  getScale() {
    return this._scale.x;
  }

  playEmote = (emote) => {
    if (emote == this.currentEmote) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (this.emoteResolve) {
        this.emoteResolve();

        this.emoteResolve = null;
      }

      if ((this.onFloor || this.isSitting) && this.emoteResolve == null) {
        this.emoteResolve = resolve;

        this.currentEmote = emote;
      } else {
        resolve();
      }
    });
  };

  // let opts = {
  //     timeScale: 2,
  //     fadeIn : 1,
  //     repetitions : 3,
  //     loop: 'repeat',
  //     clampWhenFinished: false
  // }

  stopAllAnimations = ({ fadeOut = 0.1 }) => {
    Object.keys(this.activeAnimations).forEach((key) => {
      this.stopAnimation(key, { fadeOut });
    });
  };

  playAnimation(name, opts = {}) {
    const n = name.toUpperCase();

    const animation = Animations.getByName(n);

    if (animation == null) {
      console.error("PLAY Animation not found", name);

      return;
    }

    if (!opts.reset && this.activeAnimations[name]) return;

    if (opts.stopAll) {
      this.stopAllAnimations(opts);
    }

    if (this.isCpuAnimation) {
      let loopMode = null;

      if (opts.loop != null) {
        if (opts.loop == "once") {
          loopMode = LoopOnce;
        }
        if (opts.loop == "repeat") {
          loopMode = LoopRepeat;
        }

        if (opts.loop == "pingpong") {
          loopMode = LoopPingPong;
        }
      }

      const action = this.vrm.possibleActions[n];

      if (opts.callback != null) {
        if (action.__funcListener != null) {
          action._mixer.removeEventListener("loop", action.__funcListener);

          action._mixer.removeEventListener("finished", action.__funcListener);

          action.__funcListener = null;
        }

        action.__funcListener = (e) => {
          if (e.action == action) {
            if (e.type == "finished") {
              action._mixer.removeEventListener("loop", action.__funcListener);

              action._mixer.removeEventListener(
                "finished",
                action.__funcListener,
              );

              action.__funcListener = null;

              // this.activeAnimations[name] = false
            }

            opts.callback(e);
          }
        };

        action._mixer.addEventListener("loop", action.__funcListener);

        action._mixer.addEventListener("finished", action.__funcListener);
      }

      action.clampWhenFinished = opts.clampWhenFinished ?? false;

      if (opts.repetitions != null) {
        action.repetitions = opts.repetitions;
      }

      action
        .reset()
        .setEffectiveTimeScale(opts.timeScale ?? 1)
        .setEffectiveWeight(opts.weight ?? 1)
        .fadeIn(opts.fadeIn || 0)
        .setLoop(loopMode ?? LoopRepeat, opts.repetitions ?? Infinity)
        .play();

      this.activeAnimations[name] = true;
    } else {
      console.error("not supported yet on GPU animations");
    }
  }

  stopAnimation(name, opts = {}) {
    const n = name.toUpperCase();

    const animation = Animations.getByName(n);

    if (animation == null) {
      console.error("STOP Animation not found", animName);

      return;
    }

    if (this.isCpuAnimation) {
      const action = this.vrm.possibleActions[n];

      if (!opts.fadeOut) {
        action.stop();
      } else {
        action.fadeOut(opts.fadeOut ?? 0);
      }

      this.activeAnimations[name] = false;

      if (action.__funcListener) {
        action.__funcListener({ type: "finished", action });
      }
    } else {
      console.error("not supported yet on GPU animations");
    }
  }

  stopAll = () => {
    if (this.isCpuAnimation) {
      this.activeAnimations = {};

      this.mixer?.setTime(0);

      this.highQualityMeshes.mixer.stopAllAction();
    }
  };

  setAnimation(animName) {
    const animation = Animations.getByName(animName);

    if (animation == null) {
      console.error("Animation not found", animName);

      return;
    }

    this.playEmote(animation.emote, true);

    this.setCurrentAction(animation.emote);
  }

  stopEmote = () => {
    this.currentEmote = null;

    this.emoteResolve();

    this.emoteResolve = null;
  };

  setPlayerOnFloor(val) {
    let final = val;

    if (val == false) {
      if (this.isJumping == true) {
        final = false;

        this.outOfFloorAttempt = -1;
      }

      if (this.isJumping == false) {
        this.outOfFloorAttempt++;

        if (this.outOfFloorAttempt < 15) {
          final = true;
        }
      }
    } else {
      this.outOfFloorAttempt = -1;

      final = val;
    }

    this.onFloor = final;
  }

  setPlayerIsJumping(val) {
    this.isJumping = val;

    if (val == undefined) {
      debugger;
    }
  }

  async setCurrentAction(action, force = false) {
    if (action == null) {
      debugger;
    }

    const actionName = action.name;

    if (this.isCpuAnimation) {
      const needsCpuRefresh =
        this.highQualityMeshes?.animationsVersion !== Animations.version;

      if (needsCpuRefresh) {
        VRMMesh.setupPossibleActions(
          this.gltf.userData.vrm,
          this.highQualityMeshes.mixer,
        );
      }

      if (this.currentAction != action) {
        this.lastAction = this.currentAction;

        this.currentAction = action;

        if (this.lastAction) {
          const duration = 0.1;

          this.vrm.possibleActions[this.lastAction.name].fadeOut(duration);

          // actions are updated in the vrm component
          // need to retrieves new ones from the vrm component

          if (this.vrm.possibleActions[this.currentAction.name] == null) {
            VRMMesh.setupPossibleActions(
              this.gltf.userData.vrm,
              this.highQualityMeshes.mixer,
            );
          }

          this.vrm.possibleActions[this.currentAction.name]
            .reset()
            .setEffectiveTimeScale(this.currentAction.timeScale || 1)
            .setEffectiveWeight(1)
            .fadeIn(duration)
            .play();
        } else {
          this.vrm.possibleActions[this.currentAction.name].play();

          this.vrm.possibleActions[this.currentAction.name].setEffectiveWeight(
            1,
          );
        }
      }
    } else {
      var index;

      index = this.gltf.metaIds[0].indexOf(actionName);

      const requiresAnimationRefresh =
        index == -1 || this.gltf.animationsVersion !== Animations.version;

      if (requiresAnimationRefresh && this.bakingNewActionsPromise == null) {
        this.bakingNewActionsPromise = VRMMesh.setupGPUPossibleActions(
          this.gltf,
          this.data,
        );

        await this.bakingNewActionsPromise;

        this.bakingNewActionsPromise = null;

        // override for new animation
        index = this.gltf.metaIds[0].indexOf(actionName);

        this.currentAnimationIndex = -1;

        if (index == -1) {
          console.log("couldnt re-bake animation");
          index = 0;
        }
      }

      if (this.bakingNewActionsPromise != null)
        index = this.currentAnimationIndex;

      if (index != this.currentAnimationIndex) {
        const baseTime = 0.15;

        var ts = action.timeScale ? action.timeScale * baseTime : baseTime;

        if (
          this.currentAction != null &&
          this.currentAction.fadeRatio != null
        ) {
          ts = baseTime * this.currentAction.fadeRatio;
        }

        if (force) {
          this._animations = [
            index,
            index,
            Shared.animationTimer.value + 100,
            ts,
          ];
        } else {
          this._animations = [
            this.currentAnimationIndex,
            index,
            Shared.animationTimer.value,
            ts,
          ];
        }

        this.currentAnimationIndex = index;

        this.lastAction = this.currentAction;

        this.currentAction = action;
      }
    }
  }

  fadeToAction(previousAction, activeAction, duration) {
    if (previousAction !== activeAction) {
      previousAction.fadeOut(duration);
    }

    activeAction
      .reset()
      .setEffectiveTimeScale(1)
      .setEffectiveWeight(1)
      .fadeIn(duration)
      .play();
  }

  set color(val) {
    this._color = val;
  }

  get color() {
    return this._color;
  }

  set visible(val) {
    this._visible = val;

    if (this.highQualityMeshes) {
      this.highQualityMeshes.visible = val;
    }
  }

  get visible() {
    return this._visible;
  }

  set position(val) {
    if (val.x == 0 && val.y == 0 && val.z == 0) {
      // debugger
    }

    const now = Date.now();

    if (now - this.now > 20) {
      tempVec.set(val.x, 0, val.z);

      this.floorVelocity = tempVec.distanceTo(this.lastFloorVelocityPosition);

      this.lastFloorVelocityPosition.set(val.x, 0.0, val.z);

      this.now = Date.now();
    }

    if (this.firstFrame == true) {
      this.floorVelocity = 0;

      this.lastFloorVelocityPosition.copy(val);
    }

    this.firstFrame = false;

    this._position.copy(val);

    if (this.isCpuAnimation) {
      this.vrm.position.copy(this._position);
    }
  }

  set opacity(val) {
    this._opacity = val;

    // setup opacity for all meshes only for mixer vrm
    if (this.isCpuAnimation) {
      this.vrm.traverse((child) => {
        if (child.isMesh) {
          if (child.material instanceof Array) {
            for (var i = 0; i < child.material.length; i++) {
              child.material[i].opacity = val;
            }
          } else {
            child.material.opacity = val;
          }
        }
      });
    }
  }

  get opacity() {
    return this._opacity;
  }

  set animations(val) {
    this._animations = val;
  }

  get animations() {
    return this._animations;
  }

  set rotation(val) {
    this._rotation = val + (this.isVersion0 ? 0 : Math.PI);

    if (this.isCpuAnimation) {
      this.vrm.rotation.y = this._rotation;
    }
  }

  get rotationY() {
    return this.rotation;
  }

  set rotationY(val) {
    this.rotation = val;
  }

  get rotation() {
    return this._rotation;
  }

  get position() {
    return this._position;
  }

  set atlas(val) {
    this._atlas = val;
  }

  get atlas() {
    return this._atlas;
  }

  set scale(val) {
    this._scale.set(val, val, val);
  }

  get scale() {
    return this._scale;
    // return 1;
  }

  dispose() {
    if (this.isCpuAnimation) {
      this.visible = false;

      // this.highQualityMeshes.poolUsed = false

      if (this.highQualityMeshes.mixer) {
        this.highQualityMeshes.mixer.stopAllAction();
      }

      if (this.highQualityMeshes.parent) {
        this.highQualityMeshes.parent.remove(this.highQualityMeshes);
      }
    } else {
      this.visible = false;

      this.factory.dispose(this);
    }
  }

  set url(val) {
    this._url = val;
  }

  get url() {
    return this.picture?.url;
  }

  async update(url, data) {
    await this.factory.updateVRM(this, url, data);
  }

  save() {
    this.saved = {
      highQualityMeshes: this.highQualityMeshes,
      isCpuAnimation: this.isCpuAnimation,
      usePFPs: this.usePFPs,
      gltf: this.gltf,
      scale: this._scale,
    };
  }

  restore() {
    this.highQualityMeshes = this.saved.highQualityMeshes;

    this.isCpuAnimation = this.saved.isCpuAnimation;

    this.usePFPs = this.saved.usePFPs;

    this.gltf = this.saved.gltf;

    this.saved = {};
  }
}
