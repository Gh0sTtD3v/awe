// @ts-check

import {
  COMPRESSED_SUPPORT,
  DEBUG_PHYSICS,
  GPU_TIER,
  IS_MOBILE,
} from "../constants";
import { Subsystems } from "../subsystems";
import emitter from "../engine-emitter";
import { EngineEvents } from "../engine-events";
import {
  mergeBufferGeometries,
  deinterleaveGeometry,
} from "../utils/geometry";
import scene from "../scene";
import { BillboardYMaterial } from "../xtend";
import {
  AnimationMixer,
  BufferAttribute,
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Group,
  Vector3,
  Quaternion,
} from "three";
import {
  disposeObject3D,
  disposeThreeResources,
} from "../utils/dispose";
import PlaceholderFactory from "./placeholder";

function getFirstChildrenNode(scene, name) {
  let i = 0;

  let node = null;

  while (i < scene.children.length) {
    if (scene.children[i].name.toLowerCase() == name) {
      node = scene.children[i];
    }

    i++;
  }

  return node;
}

const RE_PORTAL_PREVIEW = /^((\d+)portal_preview$|portal_preview_(\d+))$/i;

export const DEFAULTS = {
  MAX_SIZE: 200,
  DEPTH: 0.04,
  ARTWORK_SCALE: 15,
};

export default class DestinationWrapper extends Group {
  portals = {};

  placeholders = {};

  portalsMixer = null;

  artworkScale = 1;

  constructor(opts) {
    super();

    this.opts = opts;

    this.addEvents();
  }

  buildCollisionMesh() {
    let geometries = [];

    this.colliderMeshes.forEach((child) => {
      if (child.isMesh) {
        child.updateMatrixWorld();

        // samsy

        // not sure why we needed this but it was causing the mesh to be in the wrong position

        // child.getWorldPosition(child.position);

        // child.getWorldQuaternion(child.quaternion);

        // child.getWorldScale(child.scale);

        const geom = child.geometry.clone();

        geom.applyMatrix4(child.matrixWorld);

        deinterleaveGeometry(geom);

        geometries.push(geom);
      }
    });

    if (geometries.length == 0) {
      return;
    }

    const mergedGeometry = mergeBufferGeometries(geometries, false, {
      forceList: ["position"],
      ignoreMorphTargets: true,
    });

    const mesh = new Mesh(
      mergedGeometry,

      new MeshBasicMaterial({ color: 0xff00ff, wireframe: true })
    );

    this.collisionMesh = mesh;

    if (DEBUG_PHYSICS) {
      scene.add(mesh);
    }

    return mesh;
  }

  update = (delta) => {
    if (this.mixer) {
      this.mixer.update(delta);
    }

    if (this.portalsMixer) {
      this.portalsMixer.update(delta);
    }
  };

  addEvents() {
    emitter.on(EngineEvents.PRE_RENDER, this.update);
  }

  removeEvents() {
    emitter.off(EngineEvents.PRE_RENDER, this.update);
  }

  async get(opts) {
    const { paths } = this.opts;

    const { low, mid, high, low_compressed } = paths;

    let url = high;

    // GPU_TIER.tier: 0=low, 1=medium, 2=high, 3=very high
    if (GPU_TIER.tier === 0) {
      url = low;
    } else if (GPU_TIER.tier === 1) {
      url = mid;
    }
    if (IS_MOBILE && COMPRESSED_SUPPORT) {
      if (low_compressed) {
        url = low_compressed;
      }
    }

    const res = await Subsystems.gltf.loadGLTF(url);

    const colliderMeshes = [];

    /**
     * @type {Object3D[]}
     */
    const placeholders = [];

    // const floorMeshes = [];

    let portalMeshes = [];

    let portalDoorMeshes = [];

    res.scene.traverse((mesh) => {
      if (mesh.name.includes("Portal_Preview_")) {
        portalMeshes.push(mesh);
      }

      if (
        mesh.name.includes("Portal_Door_") ||
        mesh.name.includes("Portal_Mesh_")
      ) {
        portalDoorMeshes.push(mesh);
      }
    });

    this.mixer = new AnimationMixer(res.scene);

    this.portalsMixer = new AnimationMixer(res.scene);

    portalMeshes.forEach((mesh) => {
      const match = RE_PORTAL_PREVIEW.exec(mesh.name);

      this.portals[mesh.name] = {
        mesh: mesh,
        door: portalDoorMeshes.find((door) => {
          return door.name.includes(`Portal_Door_${match?.[3]}`);
        }),
        animations: {
          open: res.animations
            .filter((animation) => {
              return animation.name.includes(`Portal_Open_${match?.[3]}`);
            })
            .map((animation) => this.portalsMixer.clipAction(animation)),
          close: res.animations
            .filter((animation) => {
              return animation.name.includes(`Portal_Close_${match?.[3]}`);
            })
            .map((animation) => this.portalsMixer.clipAction(animation)),
        },
      };
    });

    const grassNode = getFirstChildrenNode(res.scene, "grass");

    grassNode?.traverse?.((child) => {
      if (child.material) {
        child.material = new BillboardYMaterial(child.material);
      }
    });

    // const displayNode = getFirstChildrenNode(res.scene, "display");

    // ====> FLOOR NODE

    const floorNode = getFirstChildrenNode(res.scene, "floor");

    floorNode?.traverse?.((child) => {
      if (child.material) {
        // floorMeshes.push(child);

        colliderMeshes.push(child);
      }
    });

    // ===> INVISIBLE FLOOR NODE

    const floorInvisibleNode = getFirstChildrenNode(
      res.scene,
      "floor_invisible"
    );

    floorInvisibleNode?.traverse?.((child) => {
      if (child.material) {
        // floorMeshes.push(child);

        colliderMeshes.push(child);

        child.visible = false;
      }
    });

    res.scene.remove(floorInvisibleNode);

    // let floors = floorMeshes.map((mesh) => {
    //     // let floor = new SpaceFloor({
    //     //     ...opts,
    //     //     // @ts-ignore
    //     //     raycastMesh: mesh,
    //     // });
    //     // floor.add(mesh);
    //     // return floor;

    //     return mesh;
    // });

    // let spaceFloorContainer = new Object3D();

    // spaceFloorContainer.name = "floor";

    // if (floors?.length) {
    //     spaceFloorContainer.add(...floors);

    //     res.scene.add(spaceFloorContainer);
    // }

    // ====> COLLISION NODE\

    const collisionNode = getFirstChildrenNode(res.scene, "collision");

    collisionNode?.traverse((child) => {
      if (child.material) {
        colliderMeshes.push(child);
      }
    });

    // ====> COLLISION INVISIBLE NODE

    const collisionInvisibleNode = getFirstChildrenNode(
      res.scene,
      "collision_invisible"
    );

    collisionInvisibleNode?.traverse((child) => {
      if (child.material) {
        colliderMeshes.push(child);
      }

      child.visible = false;
    });

    // ====> PLACEHOLDER NODE

    const placeholderNode = getFirstChildrenNode(res.scene, "placeholder");

    placeholderNode?.traverse?.((child) => {
      if (child.material) {
        placeholders.push(child);
      }
    });

    placeholders.forEach((p) => {
      p.parent.remove(p);
    });

    placeholders.forEach((p) => {
      const id = this.placeholderId(p);
      const mesh = PlaceholderFactory.create({
        id,
        size: this.opts.params?.placeholderSize,
      });

      p.getWorldPosition(mesh.position);
      p.getWorldQuaternion(mesh.quaternion);
      p.getWorldScale(mesh.scale);

      if (this.opts.params?.version === 1) {
        //
        mesh.scale.setScalar(1);
      }

      mesh.name = p.name;

      mesh.visible = false;
      this.placeholders[id] = mesh;
      res.scene.add(mesh);
    });

    this.scene = res.scene;

    this.colliderMeshes = colliderMeshes;

    this.add(res.scene);

    // ANIMATIONS

    res.animations
      .filter((anim) => !anim.name.toLowerCase().includes("portal_"))
      .forEach((animation) => {
        const action = this.mixer.clipAction(animation);
        action.play();
      });

    this.artworkScale = this.getArtworkScale();
  }

  placeholderId(mesh) {
    //
    const p = mesh.position;
    const r = mesh.rotation;

    return (
      p.x.toFixed(2) +
      "X" +
      p.y.toFixed(2) +
      "X" +
      p.z.toFixed(2) +
      "X" +
      r.x.toFixed(2) +
      "X" +
      r.y.toFixed(2) +
      "X" +
      r.z.toFixed(2)
    );
  }

  getArtworkScale() {
    //
    let maxWidth = DEFAULTS.MAX_SIZE;

    const scaleDown = this.opts.params?.artworkScale ?? DEFAULTS.ARTWORK_SCALE;

    return maxWidth / scaleDown;
  }

  destroy() {
    this.mixer?.stopAllAction();

    this.mixer = null;

    this.portalsMixer?.stopAllAction();

    this.portalsMixer = null;

    // Clear placeholders and portals to prevent stale references
    this.placeholders = {};

    this.portals = {};

    this.removeEvents();

    disposeObject3D(this);
  }
}
