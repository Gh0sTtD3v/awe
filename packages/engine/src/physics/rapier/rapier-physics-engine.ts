import {
  BufferAttribute,
  BufferGeometry,
  Clock,
  LineBasicMaterial,
  LineSegments,
} from "three";
import emitter from "../../internal/engine-emitter";
import { EngineEvents } from "../../internal/engine-events";
import { getRapier } from "./utils/get-rapier";
import { GROUPS, RIGIDBODY_TYPES } from "./constants";
import Scene from "../../internal/scene";
import type {
  World,
  EventQueue,
  Collider as RCollider,
  RayColliderToi,
} from "@dimforge/rapier3d";
import type RAPIER from "@dimforge/rapier3d";
import { ManifoldCollisionEvent } from "./manifold-collision-event";
import { IntersectionEvent } from "./intersection-event";
import { PhysicsOpts, PhysicsEngine, RigidBody, RaycastOptions, RaycastResult, CharacterController, CharacterControllerOpts } from "../types";
import { RapierRigidBody } from "./rigidbody";
import { RapierCollider } from "./rigidbody/collider";
import { RapierCharacterController } from "./rapier-character-controller";

const PHYSICS_WORLD_PARAMS = {
  gravity: {
    x: 0.0,

    y: -9.81,

    z: 0.0,
  },
};

/**
 * @public
 *
 * Wrapper for the physics engine, currently using Rapier3D
 *
 * This is the type of the {@link Physics} variable in the scripting API
 */
export default class RapierPhysicsEngine implements PhysicsEngine {
  /**
   * @internal
   */
  public opts = null;

  /**
   * @internal
   */
  public RAPIER: typeof RAPIER = null;

  /**
   * @internal
   */
  public ray = null;

  /**
   * Current Rapier world instance; cf {@link https://rapier.rs/javascript3d/classes/World.html | Rapier docs} for more info
   */
  public world: World = null;

  public eventQueue: EventQueue = null;

  private _init = false;

  private _fixedTimeStep = 1 / 60;

  /**
   * @internal
   */
  public debugLines = null;

  /**
   * @internal
   */
  public clock = new Clock();

  private _active = false;

  private _rigidBodies: RapierRigidBody[] = [];

  /**
   * @internal
   */
  constructor(
    opts: {
      debug: boolean;
    } = null,
  ) {
    this.active = false;
    this.opts = opts;
    if (opts.debug) {
      this.initDebug();
    }
  }

  /**
   * @internal
   */
  initDebug() {
    let material = new LineBasicMaterial({
      color: 0x00ff00,

      vertexColors: true,
    });

    let geometry = new BufferGeometry();
    this.debugLines = new LineSegments(geometry, material);
    this.debugLines.frustumCulled = false;
    Scene.add(this.debugLines);

    // console.log( this.)
  }

  /**
   * @internal
   */
  updateDebug = () => {
    const buffers = this.world.debugRender();
    this.debugLines.geometry.setAttribute(
      "position",
      new BufferAttribute(buffers.vertices, 3),
    );
    this.debugLines.geometry.setAttribute(
      "color",
      new BufferAttribute(buffers.colors, 4),
    );
  };

  /**
   * @internal
   */
  async init() {
    if (this._init)
      return console.warn("RapierPhysicsEngine already initialized");

    this.RAPIER = await getRapier();
    this.ray = new this.RAPIER.Ray(
      new this.RAPIER.Vector3(0, 0, 0),

      new this.RAPIER.Vector3(0, -1, 0),
    );
    this.world = new this.RAPIER.World(PHYSICS_WORLD_PARAMS.gravity);
    this.eventQueue = new this.RAPIER.EventQueue(true);
    this._init = true;
  }

  /**
   * @internal
   */
  createRigidBody(opts: PhysicsOpts) {
    //
    const bodyWrapper = new RapierRigidBody(
      this,
      opts.component,
      opts.rigitBodyOpts,
    );

    this._rigidBodies = this._rigidBodies.concat(bodyWrapper);

    return bodyWrapper;
  }

  /**
   * @internal
   */
  removeRigidBody(body: RigidBody) {
    //
    body.dispose();
    this._rigidBodies = this._rigidBodies.filter((b) => b !== body);
  }

  createCharacterController(opts?: Partial<CharacterControllerOpts>): CharacterController {
    return new RapierCharacterController(this, opts);
  }

  private __frame = 0;

  get frame() {
    //
    return this.__frame;
  }

  private _syncFromTransform(bodies: RapierRigidBody[]) {
    //
    Scene.updateMatrixWorld();

    for (let i = 0, l = bodies.length; i < l; i++) {
      //
      const body = bodies[i];
      if (body._wasDisposed) continue;
      if (!body._autoSyncTransform) continue;
      body._syncFromTransform();
    }
  }

  private _syncToTransform(bodies: RapierRigidBody[]) {
    //
    for (let i = 0, l = bodies.length; i < l; i++) {
      //
      const body = bodies[i];
      if (body._wasDisposed) continue;
      if (body.options.type !== RIGIDBODY_TYPES.DYNAMIC) continue;
      body._syncFromPhysics();
    }
  }

  private _preInterpolate(bodies: RapierRigidBody[]) {
    //
    for (let i = 0, l = bodies.length; i < l; i++) {
      //
      const body = bodies[i];
      if (body._wasDisposed) continue;
      if (!body._interpolate) continue;
      body._preInterpolate();
    }
  }

  private _interpolate(alpha: number, bodies: RapierRigidBody[]) {
    //
    for (let i = 0, l = bodies.length; i < l; i++) {
      //
      const body = bodies[i];
      if (body._wasDisposed) continue;
      if (!body._interpolate) continue;
      body._interpolatePose(alpha);
    }
  }

  /**
   * @internal
   */

  private processCollisionEvent(
    source1: RCollider,
    source2: RCollider,
    started: boolean,
  ) {
    const collider1 = RapierCollider.getFromRaw(source1);
    const collider2 = RapierCollider.getFromRaw(source2);
    if (!collider1 || !collider2) {
      return;
    }

    // console.log("COLLISION STARTED", collider1, collider2);

    //
    const isSensor = source1.isSensor() || source2.isSensor();

    /**
     * The event queue reports when a sensor intersects with another collider
     * But reports an exit event immediately on the next frame
     *
     * We'll ignore the exit notification, and instead check if the sensor is still intersecting
     * with the other collider on subsequent frames
     */
    if (isSensor) {
      //
      if (!started) return;

      collider1._onCollisionChange(
        collider2,
        new IntersectionEvent(
          collider1.component,
          collider2.component,
          this.__frame,
        ),
      );

      //
      collider2._onCollisionChange(
        collider1,
        new IntersectionEvent(
          collider2.component,
          collider1.component,
          this.__frame,
        ),
      );

      return;
    }

    collider1._onCollisionChange(
      collider2,
      started
        ? new ManifoldCollisionEvent(
            this,
            collider1.component,
            collider2.component,
            this.__frame,
          )
        : null,
    );

    //
    collider2._onCollisionChange(
      collider1,
      started
        ? new ManifoldCollisionEvent(
            this,
            collider2.component,
            collider1.component,
            this.__frame,
          )
        : null,
    );
  }

  /**
   * @internal
   */
  updateFixed = (deltaTime, bodies: RapierRigidBody[]) => {
    //
    if (deltaTime > 0.1) deltaTime = 0.1;
    if (!this.active) return;
    this.__frame++;
    this.world.timestep = deltaTime;
    this._syncFromTransform(bodies);
    this.world.step(this.eventQueue);
    this._syncToTransform(bodies);
    this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      const source1 = this.world.getCollider(handle1);
      const source2 = this.world.getCollider(handle2);
      this.processCollisionEvent(source1, source2, started);
    });

    for (let i = 0, l = bodies.length; i < l; i++) {
      const body = bodies[i];
      if (body._wasDisposed) continue;
      for (let j = 0, l = body.colliders.length; j < l; j++) {
        const collider = body.colliders[j];
        if (collider._wasDisposed) continue;
        if (collider._activeEvents.any) {
          collider._onEmitCollision(this.__frame);
        }
      }
    }

    // this.engine.world.contactsWith(player.collider, (otherCollider) => {

    //     console.log("CONTACTS WITH", otherCollider.parent().userData)

    //     this.colliders.colliders.get(0).emitter.emit("COLLIDE", {

    //         collider: this.colliders.colliders.get(otherCollider.userData.id),

    //         data: otherCollider.parent().userData
    //     });

    // });
  };

  private _accumulatedTime = 0;

  update = (dt: number, time: number) => {
    if (!this.world || !this.active) return;
    if (typeof window !== "undefined") {
      dt = Math.min(dt, 0.1);
    }

    this._accumulatedTime += dt;
    let bodies = this._rigidBodies;

    // Calculate iteration count before the fixed-step loop
    const iterationCount = Math.floor(
      this._accumulatedTime / this._fixedTimeStep,
    );

    // Emit before entering the fixed-step loop
    if (iterationCount > 0) {
      emitter.emit(EngineEvents.BEFORE_FIXED_UPDATES, iterationCount);
    }

    let now = time;
    let iteration = 0;

    while (this._accumulatedTime >= this._fixedTimeStep) {
      this._preInterpolate(bodies);

      // Emit FIXED_UPDATE with iteration info
      emitter.emit(
        EngineEvents.FIXED_UPDATE,
        this._fixedTimeStep,
        now,
        iteration,
        iterationCount,
      );

      this.updateFixed(this._fixedTimeStep, bodies);
      emitter.emit(EngineEvents.AFTER_FIXED_UPDATE, this._fixedTimeStep, now);
      this._accumulatedTime -= this._fixedTimeStep;
      now += this._fixedTimeStep;
      iteration++;
    }

    const alpha = this._accumulatedTime / this._fixedTimeStep;
    this._interpolate(alpha, bodies);
    emitter.emit(EngineEvents.FIXED_INTERPOLATE, alpha);
    if (this.opts.debug) {
      this.updateDebug();
    }
  };

  /**
   * Performs a raycast in the physics world and returns information about the hit, if any.
   * @param ray - The ray to cast.
   * @returns An object containing information about the hit, or `null` if no hit occurred.
   */
  physicsRaycast = (ray: RaycastOptions): RaycastResult | null => {
    this.ray.origin.x = ray.origin.x;
    this.ray.origin.y = ray.origin.y;
    this.ray.origin.z = ray.origin.z;
    this.ray.dir.x = ray.direction.x;
    this.ray.dir.y = ray.direction.y;
    this.ray.dir.z = ray.direction.z;

    let maxToi = ray.maxDistance || 50.0;
    let solid = ray.solid ?? true;

    let hit = this.world.castRay(
      this.ray,
      maxToi,
      solid,
      ray.filterFlags || null,
      null,
      null,
      ray.ignoreRigidbody?.raw || null,
      (rawCollider) => {
        if (ray.shouldRaycast) {
          const collider = RapierCollider.getFromRaw(rawCollider);
          if (!collider) return true;
          return ray.shouldRaycast(collider);
        }
        return true;
      },
    );

    if (hit) {
      let hitPoint = this.ray.pointAt(hit.toi);

      return {
        point: {
          x: hitPoint.x,
          y: hitPoint.y,
          z: hitPoint.z,
        },
        distance: hit.toi,
        colliderName: (hit.collider as any)?.name,
        component: (hit.collider?.parent().userData as any)?.mesh,
        raw: hit as RayColliderToi,
      };
    }

    return null;
  };

  /**
   * activate or deactivate the physics engine
   */
  set active(value: boolean) {
    this._active = value;

    if (value) {
      this.addEvents();
    } else {
      this.removeEvents();
    }
  }

  /**
   * Returns true if the physics engine is active
   */
  get active() {
    return this._active;
  }

  /**
   * @internal
   */
  addEvents() {
    emitter.on(EngineEvents.PHYSICS_UPDATE, this.update);
  }

  /**
   * @internal
   */
  removeEvents() {
    emitter.off(EngineEvents.PHYSICS_UPDATE, this.update);
  }

  /**
   * @internal
   */
  dispose() {
    this.removeEvents();
    this._init = false;
    this.RAPIER = null;
    this.ray = null;

    if (this.world != null) {
      this.world.free();
    }

    this.world = null;
    if (this.opts.debug) {
      Scene.remove(this.debugLines);
      this.debugLines.geometry.dispose();
    }
  }
}
