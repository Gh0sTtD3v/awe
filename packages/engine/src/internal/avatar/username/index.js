import { Object3D, Vector3 } from "three";

const temp1 = new Vector3();

import Geometry from "./geometry";

import Material from "./material";

import { ATLAS_EVENTS } from "../../atlas/constants";

import Wrapper from "./wrapper";

import BASE_GEOMETRY from "./base-geometry";

import emitter from "../../engine-emitter";
import { EngineEvents } from "../../engine-events";

import Camera from "../../../camera";

import PipeLineMesh from "../../pipeline/pipeline-mesh";

let c = 0;

import { LOD_VRM_VISIBILITY } from "../../constants";

import UserNameGenerator from "./generator";

import Textures from "../../textures";

export class UserNameFactory extends Object3D {
  constructor() {
    super();

    this.name = "USER_NAMES";

    this.updateEvent = this.update.bind(this);

    emitter.on(EngineEvents.PRE_RENDER, this.updateEvent);

    this.meshes = [];

    this.height = 0;

    this.textureCount = -1;
  }

  get(opts, block) {
    if (block != null) {
      this.disposeUserName(block);
    }

    return this.atlas.addImage(
      UserNameGenerator.get(
        opts.text
        // opts.image
        //     ? opts.image
        //     : Textures["DEFAULT_PLAYER_AVATAR_PICTURE"].source.data,
        // opts.nameDisplayWithPicture,
      ),

      opts.text,

      { distance: 100 }
    );
  }

  // set enabled

  setAtlas(atlas) {
    this.atlas = atlas;

    this.onNewTextureEvent = this.onNewTexture.bind(this);

    this.atlas.on(ATLAS_EVENTS.NEW_TEX, this.onNewTextureEvent);

    this.onBlockDataEvent = this.onBlockData.bind(this);

    this.atlas.on(ATLAS_EVENTS.BLOCK_DATA, this.onBlockDataEvent);

    this.onBlockRemoveEvent = this.onBlockRemove.bind(this);

    this.atlas.on(ATLAS_EVENTS.REMOVE_BLOCK, this.onBlockRemoveEvent);
  }

  onNewTexture(tex) {
    this.textureCount++;

    const mat = new Material({ tex: tex });

    const instanceMesh = new PipeLineMesh(
      new Geometry(BASE_GEOMETRY, {
        opacity: true,
        pause: true,
        atlas: true,
        max: this.atlas.distanceBasedMaxElements,
        sorting: false,
      }),
      mat,
      {
        occlusionMaterial: mat.occlusionMaterial,
        visibleOnMirror: false,
      }
    );

    instanceMesh.frustumCulled = false;

    instanceMesh.matrixAutoUpdate = false;

    this.meshes.push(instanceMesh);

    instanceMesh.textureCount = this.textureCount;

    this.add(instanceMesh);
  }

  onBlockRemove(block) {
    if (block.wrapper) {
      block.wrapper = null;
    }
  }

  update() {
    let i = 0;

    while (i < this.meshes.length) {
      if (this.meshes[i].wrappers.length > 0) {
        this.meshes[i].geometry.sort(this.meshes[i].wrappers);

        this.meshes[i].visible = true;
      } else {
        this.meshes[i].visible = false;
      }

      i++;
    }
  }

  onBlockData(blocks) {
    let i = 0;

    // i = 0
    while (i < this.meshes.length) {
      this.meshes[i].wrappers = [];

      i++;
    }

    i = 0;

    while (i < blocks.length) {
      const block = blocks[i];

      const textureIndex = block.textureIndex;

      if (block.wrapper == null) {
        block.wrapper = new Wrapper();
      }

      const wrapper = block.wrapper;

      wrapper._name = block.url;

      wrapper.atlas = {
        x: block.uvScale.x,
        y: block.uvScale.y,
        z: block.uvPos.x,
        w: block.uvPos.y,
      };

      const mesh = this.meshes[textureIndex];

      //if ( wrapper.visible && wrapper.position != null && AvatarFactory.main?.vrm.position ) {
      if (
        wrapper.visible &&
        wrapper.position != null &&
        Camera.current.position
      ) {
        temp1.copy(wrapper.position);

        //wrapper.distance =  temp1.distanceTo( AvatarFactory.main?.vrm.position )
        wrapper.distance = temp1.distanceTo(Camera.current.position);

        if (wrapper.ignoreLOD) {
          wrapper.distance = 1;
        }
      } else {
        wrapper.distance = Infinity;
      }

      // mesh may not exists if distance based
      if (mesh != null) {
        if (
          wrapper.visible &&
          wrapper.distance < Math.min(50, LOD_VRM_VISIBILITY)
        ) {
          mesh.wrappers.push(wrapper);
        }
      }

      i++;
    }
  }

  dispose() {
    this.atlas.off(ATLAS_EVENTS.NEW_TEX, this.onNewTextureEvent);

    this.atlas.off(ATLAS_EVENTS.BLOCK_DATA, this.onBlockDataEvent);

    this.atlas.off(ATLAS_EVENTS.REMOVE_BLOCK, this.onBlockRemoveEvent);

    let i = 0;

    while (i < this.meshes.length) {
      var mesh = this.meshes[i];

      this.remove(mesh);

      mesh.material.dispose();

      mesh.geometry.dispose();

      mesh = null;

      i++;
    }
  }

  disposeUserName(block) {
    if (block != null) {
      this.atlas.remove(block);
    }
  }
}
