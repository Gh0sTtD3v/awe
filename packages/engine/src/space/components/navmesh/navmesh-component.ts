// @ts-check

import { Component3D } from "../../abstract/component-3d";
import {
  init as initRecast,
  NavMesh,
  importNavMesh,
  Detour,
} from "recast-navigation";
import {
  Box3,
  Box3Helper,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  Uint32BufferAttribute,
  Vector3,
} from "three";
import { type GenNavmeshResult } from "./navmesh.worker";
import { debugNavmesh, NavmeshDebug } from "./navmesh-debug";
import { AgentParams, NavmeshAgent, NavmeshCrowd } from "./navmesh-crowd";
import {
  generateSoloNavMesh,
  SoloNavMeshGeneratorIntermediates,
} from "recast-navigation/generators";
import { RIGIDBODY_TYPES } from "../../../physics/types";
import { convertConfigUnits } from "./common";

type NavMeshResult =
  | GenNavmeshResult
  | { navmesh: NavMesh; intermediates?: any };

const defCollisionMaterial = new MeshLambertMaterial({
  color: 0xcccccc,
});

const NAVMESH_EVENTS = {
  NEW_NAVMESH: "NEW_NAVMESH",
};

import { NavmeshComponentData } from "./navmesh-data";
import conf from "../../../internal/utils/params";
import { AssetResolver } from "../../../internal/assets";

export type { NavmeshComponentData, NavmeshParams } from "./navmesh-data";

/**
 * A component that generates and manages navigation meshes (navmeshes) for AI pathfinding.
 *
 * The navmesh component collects fixed-rigidbody collision geometry from the scene within
 * a configurable bounding area, then runs the Recast Navigation algorithm to produce a
 * navigation mesh. Alternatively, a pre-generated navmesh can be loaded from a URL.
 *
 * Once the navmesh is ready, it provides a crowd system ({@link NavmeshCrowd}) for managing
 * multiple agents that can navigate the mesh with obstacle avoidance and path planning.
 *
 * Use {@link NavmeshComponent.subscribe} to be notified when the navmesh is loaded or regenerated.
 *
 * See {@link NavmeshComponentData} for the data schema used to create a navmesh component.
 *
 * @example
 * ```ts
 * // Create a navmesh component covering a 50x10x50 area
 * const navmesh = await space.components.create({
 *     type: "navmesh",
 *     position: { x: 0, y: 0, z: 0 },
 *     scale: { x: 50, y: 10, z: 50 },
 *     url: "/assets/navmesh.bin", // URL obtained from studio baking process
 *     params: {
 *         walkableHeight: 2,
 *         walkableRadius: 0.6,
 *         walkableClimb: 0.5,
 *         walkableSlopeAngle: 45
 *     }
 * });
 *
 * // Wait for the navmesh to be ready, then create an agent
 * navmesh.subscribe((nm) => {
 *     // Create an agent that controls an avatar's position
 *     const agent = navmesh.createAgent(avatarComponent, {
 *         radius: 0.5,
 *         height: 1.8,
 *         maxSpeed: 6,
 *         maxAcceleration: 20
 *     });
 *
 *     // Move the agent to a target position
 *     agent.moveTo(new Vector3(10, 0, 5), {
 *         callback: (reached) => {
 *             console.log(reached ? "Arrived!" : "Move cancelled");
 *         }
 *     });
 * });
 *
 * // Use the crowd to find random navigable points
 * const randomPoint = navmesh.crowd.findRandomPoint();
 *
 * // Create an independent crowd with custom settings
 * const customCrowd = navmesh.createCrowd({
 *     maxAgents: 200,
 *     maxAgentRadius: 1.5
 * });
 * ```
 *
 * @public
 */
export class NavmeshComponent extends Component3D<NavmeshComponentData> {
  //
  private _worker: Worker | null = null;

  /**
   * @internal
   */
  _navMesh: NavMesh = null;

  /**
   * @internal
   */
  _intermediates: SoloNavMeshGeneratorIntermediates = null;

  /**
   * @internal
   */
  collisions: Mesh[] = [];

  /**
   * @internal
   */
  debugHelper = new NavmeshDebug(this);

  private _defCrowd = new NavmeshCrowd(this);

  private _isGenerating = false;

  /** @internal */
  protected async init() {
    //
    const runtime = this.space.options?.runtime ?? "web";
    if (runtime === "web") {
      this._worker = new Worker(new URL("./navmesh.worker.ts", import.meta.url));
    }

    this.space.add(this.debugHelper);

    if (conf.debugnm) {
      this.debugHelper.enabled = true;
      this.debugHelper.visible = true;
    } else {
      this.debugHelper.enabled = false;
    }

    await initRecast();

    globalThis.$navmesh = this;

    if (this.data.url) {
      //
      await this._fetchNavmesh(this.data.url);
    } else {
      // Auto-generate navmesh when no baked URL is provided
      // Use addLoadTask so generation completes before full load finishes
      // Wait for container.loaded to ensure all collision meshes are ready
      this.container.addLoadTask(
        this.container.loaded.then(() => this.generateNavmesh()),
      );
    }
  }

  private _navmeshUrl: string = null;

  private async _fetchNavmesh(url) {
    //
    if (!url || this._navmeshUrl == url) return;

    this._navmeshUrl = url;

    const data = await AssetResolver.fetch(this._navmeshUrl, { type: "other" }).then((res) => res.arrayBuffer());

    if (this._navmeshUrl != url) return;

    const raw = new Uint8Array(data);

    this._importNavmesh({ raw, tiled: false });

    this.container.loaded.then(() => {
      // we need to wait for all the components to be loaded before we compute
      // the collisions
      this.collisions = this._getColliderMehses();
    });
  }

  private _importNavmesh(opts: NavMeshResult) {
    //
    try {
      this._disposeNavmesh();

      if ("error" in opts) {
        //
      } else if ("navmesh" in opts) {
        this._navMesh = opts.navmesh;
        this._intermediates = opts.intermediates;
      } else if (opts.tiled) {
        //
        // const navmeshProcess = createDefaultTileCacheMeshProcess();

        // const { navMesh } = importTileCache(opts.raw, navmeshProcess);
        const { navMesh } = importNavMesh(opts.raw);

        this._navMesh = navMesh;
      } else {
        const { navMesh } = importNavMesh(opts.raw);
        this._navMesh = navMesh;
      }
    } finally {
      this.emit(NAVMESH_EVENTS.NEW_NAVMESH, this._navMesh);
    }
  }

  /**
   * Subscribes to navmesh availability changes. The callback fires immediately
   * if a navmesh is already loaded, and again whenever the navmesh is regenerated or reloaded.
   *
   * @param cb - Callback receiving the navmesh instance (or `null` if disposed)
   * @returns An unsubscribe function to stop receiving updates
   */
  subscribe(cb: (navmesh: NavMesh) => void) {
    //
    if (this._navMesh) {
      cb(this._navMesh);
    }

    return this.on(NAVMESH_EVENTS.NEW_NAVMESH, cb);
  }

  private _rawMesh: Mesh = null;
  private _boxHelper = new Box3Helper(new Box3(), new Color(0xff0000));

  private async _genNavmeshOffThread(
    [positions, indices]: [Float32Array, Uint32Array],
    config,
  ): Promise<NavMeshResult> {
    //
    return new Promise<NavMeshResult>((resolve, reject) => {
      //
      let pos = this.position;
      let scale = this.scale;

      const bbox = new Box3();
      const halfExtents = new Vector3().copy(scale).divideScalar(2);
      bbox.min.copy(pos).sub(halfExtents);
      bbox.max.copy(pos).add(halfExtents);

      this._boxHelper.box.copy(bbox);

      // [positions, indices] = restrictToBounds(positions, indices, bounds);

      const geo = new BufferGeometry();
      geo.attributes.position = new Float32BufferAttribute(positions, 3);
      geo.setIndex(new Uint32BufferAttribute(indices, 1));

      // if (this._rawMesh) {
      //     this.debugHelper.remove(this._rawMesh);
      //     disposeObject3D(this._rawMesh);
      // }

      // this._rawMesh = new Mesh(
      //     geo,
      //     new MeshBasicMaterial({
      //         opacity: 0.3,
      //         transparent: true,
      //         color: 0xff0000,
      //     })
      // );
      // this.debugHelper.add(this._rawMesh);
      // this.debugHelper.add(this._boxHelper);

      config = {
        ...config,
        bounds: [bbox.min.toArray(), bbox.max.toArray()],
      };

      if (debugNavmesh) {
        //
        let result = generateSoloNavMesh(positions, indices, config, true);

        if (result.success !== true) {
          resolve({ error: result.error });
        }

        resolve({
          navmesh: result.navMesh,
          intermediates: result.intermediates,
        });
      } else {
        //
        this._worker.postMessage({
          positions,
          indices,
          config,
        });

        this._worker.onmessage = (e) => {
          const data = e.data;
          resolve(data as GenNavmeshResult);
        };
      }
    });
  }

  private _getColliderMehses() {
    //
    let colliders: Mesh[] = [];

    this.container.forEach((c) => {
      //
      if (
        !c.data.collider?.enabled ||
        c.data?.collider.rigidbodyType?.toUpperCase() !== RIGIDBODY_TYPES.FIXED
      )
        return;
      let collisionMesh = c.getCollisionMesh();
      if (collisionMesh == null) return;

      let geo = collisionMesh.geometry.clone();
      let mesh = new Mesh(geo, defCollisionMaterial);
      mesh.matrixAutoUpdate = false;
      c.updateWorldMatrix(true, false);
      mesh.matrix.copy(collisionMesh.matrix).multiply(c.matrixWorld);
      mesh.matrixWorld.copy(mesh.matrix);
      colliders.push(mesh);
    });

    return colliders;
  }

  private _drawer: import("@recast-navigation/three").DebugDrawer = null;

  /**
   * @internal
   */
  async _prune(position: Vector3) {
    //
    const navMesh = this._navMesh;

    const nearestPolyResult =
      this.crowd._recastCrowd.navMeshQuery.findNearestPoly(position);

    if (!nearestPolyResult.success) {
      console.error("failed to find nearest poly");
      return;
    }

    /* find all polys connected to the nearest poly */
    const visited = new Set<number>();
    visited.add(nearestPolyResult.nearestRef);

    const openList: number[] = [];

    openList.push(nearestPolyResult.nearestRef);

    while (openList.length > 0) {
      const ref = openList.pop()!;

      // get current poly and tile
      const { poly, tile } = navMesh.getTileAndPolyByRefUnsafe(ref);

      // visit linked polys
      for (
        let i = poly.firstLink();
        // https://github.com/emscripten-core/emscripten/issues/22134
        i !== Detour.DT_NULL_LINK;
        i = tile.links(i).next()
      ) {
        const neiRef = tile.links(i).ref();

        // skip invalid and already visited
        if (!neiRef || visited.has(neiRef)) continue;

        // mark as visited
        visited.add(neiRef);

        // visit neighbours
        openList.push(neiRef);
      }
    }

    /* disable unvisited polys */
    for (let tileIndex = 0; tileIndex < navMesh.getMaxTiles(); tileIndex++) {
      const tile = navMesh.getTile(tileIndex);

      if (!tile || !tile.header()) continue;

      const tileHeader = tile.header()!;

      const base = navMesh.getPolyRefBase(tile);

      for (let i = 0; i < tileHeader.polyCount(); i++) {
        const ref = base | i;

        if (!visited.has(ref)) {
          // set flag to 0
          // this could also be a custom 'disabled' area flag if using custom areas
          navMesh.setPolyFlags(ref, 1 << 7);

          console.log("disabled poly", ref);
        }
      }
    }

    const { DebugDrawer } = await import("@recast-navigation/three");
    this._drawer ??= new DebugDrawer();
    this.space.add(this._drawer);
    this._drawer.clear();
    this._drawer.drawNavMeshPolysWithFlags(navMesh, 1 << 7, 0x0000ff);
  }

  /**
   * Generates a navmesh from the collision geometry in the scene.
   * Collects all fixed-rigidbody colliders within the component's bounds,
   * runs the Recast algorithm off-thread, and imports the result.
   *
   * @returns The generation result, or `undefined` if already generating
   */
  async generateNavmesh() {
    if (this._isGenerating) {
      return;
    }

    try {
      this._isGenerating = true;

      const collisions = this._getColliderMehses();

      const { getPositionsAndIndices } = await import("@recast-navigation/three");
      const tris = getPositionsAndIndices(collisions);

      const config = convertConfigUnits(this.data.params);

      const res = await this._genNavmeshOffThread(tris, config);

      if ("error" in res) {
        throw new Error("failed to generate navMesh " + res.error);
      }

      console.log("navmesh generated");

      this._importNavmesh(res);

      this.collisions = collisions;

      return res;
      //
    } finally {
      this._isGenerating = false;
    }
  }

  private _disposeNavmesh() {
    //
    this._navMesh?.destroy();

    this._navMesh = null;
  }

  /** @internal */
  protected dispose() {
    //
    this._disposeNavmesh();
    this.emit(NAVMESH_EVENTS.NEW_NAVMESH, null);

    this._defCrowd.dispose();

    this.debugHelper.dispose();
  }

  /*** Public API ***/

  /**
   * The default crowd for this navmesh. Auto-updates every frame.
   * Use this to add agents, query paths, and find navigable points.
   */
  get crowd() {
    return this._defCrowd;
  }

  /**
   * Finds the closest point on the navmesh to the given world position.
   *
   * @param position - The world position to query
   * @returns The closest navigable point, or `null` if no navmesh is loaded
   */
  findClosestPoint(position: Vector3) {
    //
    if (this._navMesh == null) {
      return null;
    }

    return this._defCrowd.findClosestPoint(position);
  }

  /**
   * Creates a new independent {@link NavmeshCrowd} with custom capacity settings.
   * The returned crowd auto-updates every frame by default.
   *
   * @param opts - Optional crowd configuration
   * @param opts.maxAgents - Maximum number of agents in the crowd. Defaults to `100`.
   * @param opts.maxAgentRadius - Maximum agent radius supported by the crowd. Defaults to `1`.
   * @returns A new {@link NavmeshCrowd} instance
   */
  createCrowd(opts?: { maxAgents: number; maxAgentRadius: number }) {
    return new NavmeshCrowd(this, {
      maxAgents: opts?.maxAgents ?? 100,
      maxAgentRadius: opts?.maxAgentRadius ?? 1,
    });
  }

  /**
   * Creates a new {@link NavmeshAgent} on the default crowd at the given starting position.
   *
   * @param position - The starting world position for the agent
   * @param crowdAgentParams - Optional agent parameters to override defaults
   * @returns The created {@link NavmeshAgent}
   */
  createAgent(
    position: Vector3,
    crowdAgentParams?: Partial<AgentParams>,
  ): NavmeshAgent;
  /**
   * Creates a new {@link NavmeshAgent} on the default crowd attached to a host Object3D.
   * The host's position and rotation will be automatically updated as the agent moves.
   *
   * @param host - The Object3D whose position/rotation will be driven by the agent
   * @param crowdAgentParams - Optional agent parameters to override defaults.
   *   If `radius` or `height` are not provided, they are inferred from the host's bounding box.
   * @returns The created {@link NavmeshAgent}
   */
  createAgent(
    host: Object3D,
    crowdAgentParams?: Partial<AgentParams>,
  ): NavmeshAgent;
  createAgent(hostOrPos: any, crowdAgentParams?: Partial<AgentParams>) {
    //
    if (this._defCrowd == null) {
      throw new Error("Navmesh not initialized");
    }
    return this._defCrowd.addAgent(hostOrPos, crowdAgentParams);
  }

  /**
   * Removes and disposes an agent from the default crowd, cleaning up all its resources.
   *
   * @param agent - The agent to remove
   */
  removeAgent(agent: NavmeshAgent) {
    agent.dispose();
  }
}
