import { Group } from "three";
import emitter from "../engine-emitter";
import { EngineEvents } from "../engine-events";
import Camera from "../../camera";
import InstancedMeshWrapper from "./instance-mesh-wrapper";

/**
 * LODInstancedGroup - A Group that contains multiple InstancedPipelineMesh objects,
 * one per LOD level. This replaces the fork's _lods rendering with standard Three.js.
 *
 * The group manages:
 * - A shared instances array
 * - Sorting and distributing instances to the appropriate LOD mesh based on distance
 * - Visibility of the overall group
 */
export default class LODInstancedGroup extends Group {
  constructor(lodMeshes, masterGeometry, opts = {}) {
    super();

    this.lodMeshes = lodMeshes;
    this.masterGeometry = masterGeometry;
    this.instanceType = opts.type;

    // Add all LOD meshes as children
    lodMeshes.forEach((mesh, i) => {
      mesh._lodIndex = i;
      mesh._isLODChild = true; // Flag to skip individual sorting
      this.add(mesh);
    });

    this.instances = [];
    this.count = -1;

    // For non-sorted mode
    this.instancesCount = 0;
    this.wrapperFlagUpdates = [];

    this._visible = true;

    this.addEvents();
  }

  get visible() {
    return this._visible;
  }

  set visible(v) {
    this._visible = v;
    // Individual mesh visibility is controlled by instance count during sort
  }

  setScaleRatio(val) {
    this._scaleRatio = val;
    this.lodMeshes.forEach((mesh) => mesh.setScaleRatio(val));
  }

  /**
   * Sort instances and distribute to appropriate LOD meshes based on distance
   */
  sort(camera, force = false) {
    if (this.instances.length === 0) {
      this.masterGeometry._maxInstanceCount = 0;
      this.lodMeshes.forEach((mesh) => {
        mesh.geometry._maxInstanceCount = 0;
        mesh.visible = false;
      });
      return;
    }

    if (this.masterGeometry.useUniqueFrustumTestFunction != null) {
      let frustum = camera && camera.frustum ? camera.frustum : Camera._frustum;
      let res = this.masterGeometry.useUniqueFrustumTestFunction(frustum);
      if (res === false) {
        this.masterGeometry._maxInstanceCount = 0;
        this.lodMeshes.forEach((mesh) => {
          mesh.geometry._maxInstanceCount = 0;
          mesh.visible = false;
        });
        return;
      }
    }

    // Copy buffer mode
    if (this.masterGeometry.copyBuffer) {
      if (
        this.masterGeometry.bufferVersion !=
        this.masterGeometry.copyBuffer.bufferVersion
      ) {
        this.masterGeometry.updateCopyBuffers(this.masterGeometry.copyBuffer);
      }

      this.masterGeometry._maxInstanceCount =
        this.masterGeometry.copyBuffer._maxInstanceCount;
      this.masterGeometry.projMatrix =
        this.masterGeometry.copyBuffer.projMatrix;
      this.masterGeometry._wMatrix = this.masterGeometry.copyBuffer._wMatrix;

      // Compute closest distance per geometry
      this.masterGeometry.computeClosestDistance(camera);

      // Copy LOD instance counts from copy buffer
      if (this.masterGeometry._lods) {
        let i = 0;
        while (i < this.masterGeometry._lods.length) {
          const lodGeo = this.masterGeometry._lods[i];
          const copyLodGeo = this.masterGeometry.copyBuffer._lods[i];
          lodGeo._maxInstanceCount = copyLodGeo._maxInstanceCount;
          lodGeo._closestDistance = copyLodGeo._closestDistance;
          i++;
        }
      }
    } else {
      // Regular sorting mode
      if (this.masterGeometry.useSorting === true) {
        this.masterGeometry.sort(this.instances, camera);
        this.masterGeometry.computeClosestDistance(camera);
      } else {
        if (this.instancesCount !== this.instances.length) {
          this.masterGeometry.assemble(this.instances);
          this.instancesCount = this.instances.length;
        }
      }
    }

    // Handle non-sorted updates
    if (this.masterGeometry.useSorting === false) {
      let h = 0;
      while (h < this.wrapperFlagUpdates.length) {
        this.masterGeometry.updateNonSorted(this.wrapperFlagUpdates[h]);
        h++;
      }
      this.wrapperFlagUpdates = [];
      this.masterGeometry.rangeNonSorted(this.instances);
    }

    // Update visibility for each LOD mesh based on instance counts
    let anyVisible = false;
    this.lodMeshes.forEach((mesh, i) => {
      const lodGeo = this.masterGeometry._lods[i];
      const hasInstances = lodGeo._maxInstanceCount > 0;
      mesh.visible = hasInstances;
      if (hasInstances) {
        anyVisible = true;
        mesh._closestDistance =
          lodGeo._closestDistance || this.masterGeometry._closestDistance;
      }
    });

    this._visible = anyVisible;

    // DEBUG: Update on-screen LOD panel
    // if (typeof window !== 'undefined') {
    //     let panel = document.getElementById('lod-debug-panel');
    //     if (!panel) {
    //         panel = document.createElement('div');
    //         panel.id = 'lod-debug-panel';
    //         panel.style.cssText = 'position:fixed;z-index:9999;bottom:10px;left:10px;background:rgba(0,0,0,0.8);color:#0f0;font:12px monospace;padding:10px;z-index:9999;min-width:200px;';
    //         document.body.appendChild(panel);
    //     }
    //     const name = this.instanceType || 'mesh';
    //     const stats = this.lodMeshes.map((_, i) =>
    //         `LOD${i}: ${this.masterGeometry._lods[i]._maxInstanceCount}`
    //     ).join(' | ');

    //     // Store per-group stats
    //     if (!window._lodStats) window._lodStats = {};
    //     window._lodStats[name] = stats;

    //     // Render all groups
    //     panel.innerHTML = Object.entries(window._lodStats)
    //         .map(([k, v]) => `<div>${k}: ${v}</div>`)
    //         .join('');
    // }
  }

  add(child) {
    // If adding instances (not mesh children), use addInstance
    if (child._isLODChild || child.isObject3D) {
      return super.add(child);
    }
    return this.addInstance(child);
  }

  addInstance(opts) {
    if (this.masterGeometry == null) {
      return;
    }

    this.count++;

    if (this._scaleRatio != null) {
      opts.scaleRatio = this._scaleRatio;
    }

    let index = this.count;

    if (this.masterGeometry.useSorting === false) {
      // Reuse indices for non-sorted mode
      if (
        this.lodMeshes[0].nonUsedIndexes &&
        this.lodMeshes[0].nonUsedIndexes.length > 0
      ) {
        index = this.lodMeshes[0].nonUsedIndexes.shift();
      }
      if (this.lodMeshes[0].usedIndexes) {
        this.lodMeshes[0].usedIndexes.push(index);
      }
    }

    const instance = new InstancedMeshWrapper(
      this,
      this.masterGeometry,
      index,
      opts
    );

    this.instances.push(instance);

    if (this.masterGeometry.useSorting === false) {
      this.wrapperFlagUpdates.push(instance);
    }

    return instance;
  }

  wrapperUpdate(wrapper) {
    this.wrapperFlagUpdates.push(wrapper);
  }

  remove(child) {
    // If removing instances (not mesh children)
    if (child._isLODChild || child.isObject3D) {
      return super.remove(child);
    }
    return this.removeInstance(child);
  }

  removeInstance(instance) {
    if (this.masterGeometry == null) {
      return;
    }

    let index = -1;

    if (this.masterGeometry.useSorting === false) {
      const usedIndex = this.lodMeshes[0].usedIndexes?.indexOf(instance.id);
      if (usedIndex !== undefined && usedIndex !== -1) {
        this.lodMeshes[0].usedIndexes.splice(usedIndex, 1);
        this.lodMeshes[0].nonUsedIndexes.push(instance.id);
      }
    } else {
      index = this.instances.indexOf(instance);
      if (index === -1) {
        return;
      }
    }

    this.instances.splice(index, 1);
  }

  _update(scene, camera, force = false) {
    let parent = this;

    while (parent.parent !== null) {
      parent = parent.parent;
    }

    if (parent != null && parent === scene) {
      this.sort(camera, force);
    }
  }

  addEvents() {
    if (this.updateEvent == null) {
      this.updateEvent = this._update.bind(this);
      emitter.on(EngineEvents.BEFORE_SCENE_RENDER, this.updateEvent);
    }
  }

  removeEvents() {
    if (this.updateEvent != null) {
      emitter.off(EngineEvents.BEFORE_SCENE_RENDER, this.updateEvent);
      this.updateEvent = null;
    }
  }

  dispose() {
    this.removeEvents();
    this.lodMeshes.forEach((mesh) => {
      if (mesh.dispose) {
        mesh.dispose();
      }
    });
  }

  reset() {
    this.dispose();
  }

  // Proxy properties to first LOD mesh for compatibility
  get geometry() {
    return this.masterGeometry;
  }

  get baseGeometry() {
    return this.masterGeometry;
  }

  get material() {
    return this.lodMeshes[0]?.material;
  }

  set material(mat) {
    if (!this.lodMeshes) return;
    this.lodMeshes.forEach((mesh) => {
      mesh.material = mat;
    });
  }

  get customDepthMaterial() {
    return this.lodMeshes[0]?.customDepthMaterial;
  }

  set customDepthMaterial(mat) {
    if (!this.lodMeshes) return;
    this.lodMeshes.forEach((mesh) => {
      mesh.customDepthMaterial = mat;
    });
  }

  get castShadow() {
    return this.lodMeshes[0]?.castShadow;
  }

  set castShadow(val) {
    if (!this.lodMeshes) return;
    this.lodMeshes.forEach((mesh) => {
      mesh.castShadow = val;
    });
  }

  get receiveShadow() {
    return this.lodMeshes[0]?.receiveShadow;
  }

  set receiveShadow(val) {
    if (!this.lodMeshes) return;
    this.lodMeshes.forEach((mesh) => {
      mesh.receiveShadow = val;
    });
  }

  get frustumCulled() {
    return this.lodMeshes[0]?.frustumCulled;
  }

  set frustumCulled(val) {
    if (!this.lodMeshes) return;
    this.lodMeshes.forEach((mesh) => {
      mesh.frustumCulled = val;
    });
  }

  get layers() {
    return this.lodMeshes[0]?.layers;
  }

  set layers(val) {
    if (!this.lodMeshes) return;
    this.lodMeshes.forEach((mesh) => {
      if (mesh.layers && val) {
        mesh.layers.mask = val.mask;
      }
    });
  }
}
