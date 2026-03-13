import VRMMesh from "./mesh";

import VRMBuilder from "./builder/index";

import AnimatedWrapper from "./wrapper";

import { Group } from "three";

import GLTF from "../../gltf";

import emitter from "../../engine-emitter";
import { EngineEvents } from "../../engine-events";

import { ATLAS_EVENTS } from "../../atlas/constants";

import { disposeThreeResources } from "../../utils/dispose";

import { IDLE, RUN, WALK, JUMP, FLY } from "../constants";

// import Camera from "../../../camera"

import {
  DEFAULT_AVATAR_VRM,
  LOD_VRM,
  LOD_VRM_VISIBILITY,
  LOD_VRM_DISTANCE,
} from "../../constants";

import Camera from "../../../camera";

import Shared from "../../utils/globals/shared";

const DEFAULT_OPTS = {
  useCpuAnimation: false,
};

import Renderer from "../../renderer";

import { getFrame } from "../../utils/frame-counter";

import { DisposePipelinesMeshes } from "../../utils/dispose";

export const CALLBACKS = Symbol("callbacks");

var iid = 0;
export class VRMFactory extends Group {
  constructor(opts = {}) {
    super();

    this.frame = -1;

    this.iid = iid++;

    this.avatarFactory = opts.avatarFactory;

    this.GLTFManager = GLTF.getInstance();

    VRMMesh.setGLTFManager(this.GLTFManager);

    this.wrappers = [];

    this.VRMHighMeshes = [];

    this.VRMBakedMeshes = {};

    this.VRMPromises = {};

    this.preloaded = false;

    this.name = "VRM_AVATAR";

    this._enabled = true;

    this.onNewTextureEvent = this.onNewTexture.bind(this);

    this.onBlockDataEvent = this.onBlockData.bind(this);

    this.onBlockRemoveEvent = this.onBlockRemove.bind(this);

    this.highQualityContainer = new Group();

    this.avatarPFPContainer = new Group();

    this.bakedQualityContainer = new Group();

    this.add(this.highQualityContainer);

    this.add(this.avatarPFPContainer);

    this.add(this.bakedQualityContainer);

    this.avatarPFPContainer.name = "AVATAR_PFP_CONTAINER";

    this.highQualityContainer.name = "AVATAR_HIGH_CONTAINER";

    this.bakedQualityContainer.name = "AVATAR_BAKED_CONTAINER";

    this.sortingWrappers = {};

    this.pfpSortingWrappers = {};

    this.addEvents();

    globalThis.VRMFactory = this;
  }

  async preload() {
    var ps = [];

    if (this.preloaded == false) {
      ps.push(this.load(DEFAULT_AVATAR_VRM, { useCpuAnimation: false, debug: false }));

      ps.push(this.load(LOD_VRM, { useCpuAnimation: false, debug: false }));

      this.preloaded = Promise.all(ps);

      return this.preloaded;
    }

    return this.preloaded;
  }

  async load(url, opts = {}) {
    var pluginString = this.getPluginString(opts);

    opts.pluginString = pluginString;

    const data = Object.assign({}, DEFAULT_OPTS, opts);

    if (
      data.useCpuAnimation == false &&
      this.GLTFManager.isLock(url + pluginString) == true
    ) {
      // wait for the gltf to be loaded and unlocked before going through

      // loading once will return a promise only if the gltf is already loading somewhere else

      await this.GLTFManager.loadOnce({
        url: url,
        name: url + pluginString,
      });
    }

    if (data.useCpuAnimation == true) {
      // debugger

      var gltf = await this.GLTFManager.getSingleInstance(url);

      gltf.userData.vrm.lookAt = null;

      gltf.isCpuAnimation = true;

      var models = VRMMesh.getHigh(gltf, opts);

      this.VRMHighMeshes.push(models);

      VRMBuilder.setLocalScale(gltf);

      models.scene.url = url;

      this.highQualityContainer.add(models.scene);

      // debugger

      return models;
    } else {
      if (this.VRMBakedMeshes[url + pluginString] == null) {
        const gltf = await this.GLTFManager.loadObject({
          url: url,
          name: url + pluginString,
        });

        this.VRMBakedMeshes[url + pluginString] = await VRMMesh.get(
          gltf,
          url,
          opts
        );

        // this.VRMBakedMeshes[url + pluginString].originalGLTF = gltf

        // unlock simultaneous loading of the same vrm
        // we need to do this because we are using the same gltf instance
        // for all the vrm instances, waiting for it to be processed

        this.addPFPMeshes();

        this.bakedQualityContainer.add(this.VRMBakedMeshes[url + pluginString]);

        // add global meshes to the avatar container

        this.GLTFManager.unlock(url + pluginString);

        return this.VRMBakedMeshes[url + pluginString];
      }
    }
  }

  async get(url, opts = {}, picture = null) {
    var avatarURL = DEFAULT_AVATAR_VRM;

    var meshes;

    const pluginString = this.getPluginString(opts);

    if (opts.awaitAvatarLoading == true) {
      avatarURL = url;

      var model = await this.load(avatarURL, opts);

      if (opts.useCpuAnimation) {
        meshes = model;
      } else {
        meshes = this.VRMBakedMeshes[avatarURL + pluginString];

        meshes.visible = this.enabled;
      }
    } else {
      avatarURL = DEFAULT_AVATAR_VRM;

      meshes = this.VRMBakedMeshes[avatarURL];

      meshes.visible = this.enabled;
    }

    meshes.name = avatarURL + pluginString;

    meshes.originalURL = avatarURL;

    const wrapper = new AnimatedWrapper(meshes, {
      name: avatarURL,

      picture: picture,

      data: opts,

      factory: this,

      pluginString: pluginString,
    });

    this.wrappers.push(wrapper);

    // if we are not waiting for the new avatar to load
    // we can update the vrm after the wrapper is created

    if (opts.awaitAvatarLoading != true) {
      setTimeout(() => {
        this.updateVRM(wrapper, url, opts);
      }, opts.awaitLoaderThrottle);
    }

    // force first update
    // if( wrapper.highQualityMeshes ){

    //     wrapper.highQualityMeshes.mixer.update(6)

    //     wrapper.highQualityMeshes.mixer[CALLBACKS]?.forEach(it=>it());

    //     wrapper.gltf.userData.vrm.update(6)
    // }

    return wrapper;
  }

  updateVRM(wrapper, url, data = {}) {
    return new Promise((resolve, reject) => {
      if (wrapper != null) {
        this.load(url, data).then((res) => {
          if (data.useCpuAnimation == true) {
            wrapper.updateVRM(res);
          } else {
            const c = url + this.getPluginString(data);
            const cachedMesh = this.VRMBakedMeshes[c];
            if (cachedMesh) {
              wrapper.updateVRM(cachedMesh);
            }
          }

          // reset LOD then reset quality in case it is in LOD
          wrapper.isLOD = false;

          this.setWrapperQuality(wrapper);

          resolve();
        });
      }
    });
  }

  setAtlas(atlas) {
    if (this.atlas != null) {
      this.atlas.off(ATLAS_EVENTS.NEW_TEX, this.onNewTextureEvent);

      this.atlas.off(ATLAS_EVENTS.BLOCK_DATA, this.onBlockDataEvent);

      this.atlas.off(ATLAS_EVENTS.REMOVE_BLOCK, this.onBlockRemoveEvent);
    }

    this.atlas = atlas;

    this.atlas.on(ATLAS_EVENTS.NEW_TEX, this.onNewTextureEvent);

    this.atlas.on(ATLAS_EVENTS.BLOCK_DATA, this.onBlockDataEvent);

    this.atlas.on(ATLAS_EVENTS.REMOVE_BLOCK, this.onBlockRemoveEvent);
  }

  setWrapperQuality(wrapper) {
    const requiresHighQuality =
      wrapper.main ||
      wrapper.ignoreLOD == true ||
      wrapper.data?.useCpuAnimation == true;

    if (requiresHighQuality) {
      if (wrapper.isLOD == true && wrapper.saved?.gltf != null) {
        wrapper.isLOD = false;

        wrapper.restore();

        wrapper.updateVRM(wrapper.gltf);
      }

      return true;
    }

    var dist = Camera.current.position.distanceTo(wrapper.position);

    var inVisibleRange = true;

    if (wrapper.ignoreLOD != true) {
      inVisibleRange = dist < LOD_VRM_VISIBILITY;

      if (inVisibleRange == false) {
        return inVisibleRange;
      }
    }

    const needsLOD = dist > LOD_VRM_DISTANCE && !wrapper.ignoreLOD;

    if (needsLOD) {
      if (wrapper.isLOD == false) {
        wrapper.isLOD = true;

        wrapper.save();

        // put into LOD VRM instantly

        wrapper.updateVRM(this.VRMBakedMeshes[LOD_VRM]);
      }
    } else {
      if (wrapper.isLOD == true) {
        wrapper.isLOD = false;

        wrapper.restore();

        wrapper.updateVRM(wrapper.gltf);
      }
    }

    return inVisibleRange;
  }

  update(delta) {
    this.sortingWrappers = {};

    this.pfpSortingWrappers = {};

    if (this.wrappers.length > 0) {
      let i = 0;

      while (i < this.wrappers.length) {
        const wrapper = this.wrappers[i];

        const visible = this.setWrapperQuality(wrapper);

        if (visible && wrapper.visible) {
          this.setAnimations(wrapper, delta);

          if (wrapper.highQualityMeshes) {
            const highQualityMeshes = wrapper.highQualityMeshes;

            // console.log( highQualityMeshes.boundingSphere )
            // debugger;

            highQualityMeshes.visible = true;

            // setup first mesh for animation
            if (highQualityMeshes.firstMesh == null) {
              highQualityMeshes.traverse((child) => {
                // sam
                // adding child.skeleton to check if the mesh is a skinned mesh
                // trouble with the item equipement

                if (
                  child.isMesh &&
                  child.skeleton &&
                  highQualityMeshes.firstMesh == null
                ) {
                  highQualityMeshes.firstMesh = child;
                  return;
                }
              });
            }

            if (highQualityMeshes.visible) {
              highQualityMeshes.position.set(
                wrapper.position.x,
                wrapper.position.y,
                wrapper.position.z
              );

              let updated = false;

              // dont touch this

              highQualityMeshes.firstMesh.onBeforeRender = () => {
                if (this.frame != getFrame() && updated == false) {
                  if (highQualityMeshes.mixer.time == 0) {
                    // console.log(highQualityMeshes.mixer);
                  }

                  highQualityMeshes.mixer.update(delta);

                  highQualityMeshes.mixer[CALLBACKS]?.forEach((it) => it());

                  wrapper.gltf.userData.vrm.update(delta);

                  updated = true;
                }
              };
            } else {
              highQualityMeshes.firstMesh.onBeforeRender = null;
            }
          } else {
            if (this.sortingWrappers[wrapper.vrmName] == null) {
              this.sortingWrappers[wrapper.vrmName] = [];
            }

            this.sortingWrappers[wrapper.vrmName].push(wrapper);

            if (wrapper.usePFPs) {
              if (this.pfpSortingWrappers[wrapper.vrmName] == null) {
                this.pfpSortingWrappers[wrapper.vrmName] = [];
              }

              if (
                this.pfpSortingWrappers[wrapper.vrmName][
                  wrapper.textureIndex
                ] == null
              ) {
                this.pfpSortingWrappers[wrapper.vrmName][wrapper.textureIndex] =
                  [];
              }

              this.pfpSortingWrappers[wrapper.vrmName][
                wrapper.textureIndex
              ].push(wrapper);
            }
          }
        }
        i++;
      }
    }

    this.frame = getFrame();
  }

  async setAnimations(wrapper, delta) {
    return;
    if (wrapper.isSitting) {
      if (wrapper.currentEmote) {
        wrapper.setCurrentAction(wrapper.currentEmote);
      }
      return;
    }

    let newAction = null;
    let fall = false;

    if (wrapper.smoothedFloorVelocity < 0.012) {
      newAction = IDLE;
    } else if (wrapper.smoothedFloorVelocity < 0.3) {
      newAction = WALK;
    } else if (wrapper.smoothedFloorVelocity > 0.6) {
      newAction = FLY;
    } else {
      newAction = RUN;
    }

    if (
      wrapper.currentEmote == null &&
      newAction !== wrapper.currentAction &&
      wrapper.currentAction !== IDLE &&
      (newAction === FLY || newAction === RUN || newAction === WALK)
    ) {
      if (wrapper.runThresholdCount < wrapper.runThresholdCountMax) {
        wrapper.runThresholdCount += delta;
        newAction = wrapper.currentAction;
      }
    } else {
      wrapper.runThresholdCount = 0;
    }

    if (!wrapper.onFloor && wrapper.isJumping) {
      newAction = JUMP;
    }

    if (!wrapper.onFloor && !wrapper.isJumping) {
      newAction = JUMP;
      fall = true;
    }

    if (newAction !== IDLE && wrapper.currentEmote) {
      wrapper.stopEmote();
    }

    if (wrapper.currentEmote && newAction === IDLE) {
      newAction = wrapper.currentEmote;
    }

    if (fall && newAction === JUMP && newAction !== wrapper.currentAction) {
      if (wrapper.actionConfirmation < 20) {
        wrapper.actionConfirmation++;
        newAction = wrapper.currentAction;
      }
    } else {
      wrapper.actionConfirmation = 0;
    }

    wrapper.setCurrentAction(newAction);
  }

  addPFPMeshes() {
    this.onBlockData(this.atlas.blocks);

    // for each model
    Object.values(this.VRMBakedMeshes).forEach((mod) => {
      const model = mod;

      // if a model is using pfp options

      if (model.pfpOptions) {
        let i = 0;

        // for each mega texture in the atlas

        if (model.pfpOptions.megaTextures == null) {
          model.pfpOptions.megaTextures = [];

          model.pfpOptions.pfpMeshes = [];
        }

        while (i < this.atlas.megaTextures.length) {
          const megaTexture = this.atlas.megaTextures[i];

          if (model.pfpOptions.megaTextures[i] == null) {
            model.pfpOptions.megaTextures[i] = megaTexture;

            const mesh = VRMMesh.getVRMAtlasMesh(
              model.pfpOptions,
              megaTexture,
              i
            );

            model.pfpOptions.pfpMeshes[i] = mesh;

            this.avatarPFPContainer.add(model.pfpOptions.pfpMeshes[i]);
          }

          i++;
        }
      }
    });
  }

  preRender(scene, camera) {
    Object.values(this.VRMBakedMeshes).forEach((mod) => {
      const model = mod;

      if (
        this.sortingWrappers[model.name] != null &&
        this.sortingWrappers[model.name].length > 0
      ) {
        model.instanceCount = this.sortingWrappers[model.name].length;

        model.visible = this.enabled && model.instanceCount > 0;

        if (model.visible) {
          let i = 0;

          while (i < model.children.length) {
            const geometry = model.children[i].geometry;

            if (geometry.copyBuffer) {
              if (geometry.bufferVersion != geometry.copyBuffer.bufferVersion) {
                geometry.updateCopyBuffers(geometry.copyBuffer);
              }

              geometry._maxInstanceCount =
                geometry.copyBuffer._maxInstanceCount;

              geometry._closestInstance = geometry.copyBuffer._closestInstance;

              model.children[i]._closestDistance =
                geometry.copyBuffer._closestDistance;

              // geometry.boundingSphere.copy( geometry.copyBuffer.boundingSphere )
            } else {
              geometry.sort(this.sortingWrappers[model.name], camera);

              geometry.computeClosestDistance(camera);

              // need to setup closest distance as this is an instanced
              // and this needs to be sorted out in the setTransparencySorting method the renderer
              model.children[i]._closestDistance = geometry._closestDistance;
            }

            i++;
          }
        }
      } else {
        model.visible = false;
      }
    });

    let i = 0;

    while (i < this.avatarPFPContainer.children.length) {
      const pfpmesh = this.avatarPFPContainer.children[i];

      if (
        this.pfpSortingWrappers[pfpmesh.name] &&
        this.pfpSortingWrappers[pfpmesh.name][pfpmesh.geometry.textureID]
      ) {
        const pfpWrappers =
          this.pfpSortingWrappers[pfpmesh.name][pfpmesh.geometry.textureID];

        if (pfpWrappers) {
          pfpmesh.visible = true;

          pfpmesh.geometry.sort(pfpWrappers, camera);
        }
      } else {
        pfpmesh.visible = false;
      }

      i++;
    }
  }

  addEvents() {
    if (this.updateEvent == null) {
      this.updateEvent = this.update.bind(this);

      emitter.on(EngineEvents.LATE_UPDATE, this.updateEvent);

      this.preRenderEvent = this.preRender.bind(this);

      emitter.on(EngineEvents.BEFORE_SCENE_RENDER, this.preRenderEvent);
    }
  }

  removeEvents() {
    if (this.updateEvent != null) {
      emitter.off(EngineEvents.LATE_UPDATE, this.updateEvent);

      this.updateEvent = null;

      emitter.off(EngineEvents.BEFORE_SCENE_RENDER, this.preRenderEvent);

      this.preRenderEvent = null;
    }
  }

  onNewTexture(tex) {
    this.addPFPMeshes();
  }

  onBlockData(blocks) {
    if (blocks.blockMap) {
      let c = 0;

      while (c < this.wrappers.length) {
        if (blocks.blockMap[this.wrappers[c].url] != null) {
          this.wrappers[c].atlas = blocks.blockMap[this.wrappers[c].url].atlas;

          this.wrappers[c].textureIndex =
            blocks.blockMap[this.wrappers[c].url].textureIndex;
        }

        c++;
      }
    }
  }

  onBlockRemove(block) {
    if (block.wrapper) {
      block.wrapper = null;
    }
  }

  set enabled(val) {
    this._enabled = val;
  }

  get enabled() {
    return this._enabled;
  }

  dispose(wrapper) {
    var index = this.wrappers.indexOf(wrapper);

    this.wrappers.splice(index, 1);

    wrapper = null;
  }

  disposeAll() {
    this.removeEvents();

    let i = 0;

    while (i < this.wrappers.length) {
      this.wrappers[i].dispose();

      i++;
    }

    this.wrappers = [];

    i = 0;

    // console.log("high meshes ? ", this.VRMHighMeshes.length);

    // console.log(this.VRMHighMeshes);

    while (i < this.VRMHighMeshes.length) {
      disposeThreeResources(this.VRMHighMeshes[i].scene);

      this.VRMHighMeshes[i].scene.traverse((child) => {
        if (child.isMesh) {
          // console.log(child.name);

          child.dispose();

          if (child.geometry) {
            child.geometry.dispose();

            child.geometry = null;
          }
        }
      });

      if (this.VRMHighMeshes[i].scene.parent) {
        this.VRMHighMeshes[i].scene.parent.remove(this.VRMHighMeshes[i].scene);
      }

      i++;
    }

    for (const key in this.VRMBakedMeshes) {
      let c = 0;

      while (c < this.VRMBakedMeshes[key].children.length) {
        const child = this.VRMBakedMeshes[key].children[c];

        console.log("dispose..", this.VRMBakedMeshes[key].children[c]);

        DisposePipelinesMeshes(child);

        child.dispose();

        c++;
      }

      if (this.VRMBakedMeshes[key].parent) {
        this.VRMBakedMeshes[key].parent.remove(this.VRMBakedMeshes[key]);
      }
    }

    this.VRMBakedMeshes = [];

    this.remove(this.highQualityContainer);

    this.remove(this.avatarPFPContainer);

    this.remove(this.bakedQualityContainer);

    this.highQualityContainer = null;

    this.avatarPFPContainer = null;
  }

  getPluginString(opts) {
    var str = "";

    if (opts.plugins != null) {
      let i = 0;

      while (i < opts.plugins.length) {
        str += opts.plugins[i].name + ",";
        if (opts.plugins[i].uniforms != null) {
          for (var key in opts.plugins[i].uniforms) {
            var u = opts.plugins[i].uniforms[key];
            if (
              u != null &&
              u !== Shared.timer &&
              typeof u.value === "number"
            ) {
              str += key + ":" + u.value + ",";
            }
          }
        }
        i++;
      }
    }

    if (opts.renderMode != null && opts.renderMode != "default") {
      str += opts.renderMode + ",";
    }

    if (opts.batchID != null && Array.isArray(opts.batchID)) {
      str += opts.batchID.join(",") + ",";
    }

    return str;
  }
}
