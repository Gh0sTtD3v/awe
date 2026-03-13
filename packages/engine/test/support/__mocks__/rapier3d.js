/**
 * Minimal mock of @dimforge/rapier3d for Jest.
 * Only stubs the API surface used during engine boot + basic ticking.
 */

class Vec3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class Ray {
  constructor(origin, dir) {
    this.origin = origin;
    this.dir = dir;
  }
}

class EventQueue {
  constructor() {}
  drainCollisionEvents() {}
  drainContactForceEvents() {}
}

class World {
  constructor(gravity) {
    this.gravity = gravity;
  }
  step() {}
  createRigidBody() {
    return {
      handle: 0,
      translation: () => new Vec3(),
      rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }),
      setTranslation: () => {},
      setRotation: () => {},
      setLinvel: () => {},
      setAngvel: () => {},
      linvel: () => new Vec3(),
      angvel: () => new Vec3(),
      setEnabled: () => {},
      isEnabled: () => true,
      setGravityScale: () => {},
      lockTranslations: () => {},
      lockRotations: () => {},
      setEnabledRotations: () => {},
      setEnabledTranslations: () => {},
      setLinearDamping: () => {},
      setAngularDamping: () => {},
      addForce: () => {},
      addTorque: () => {},
      applyImpulse: () => {},
      resetForces: () => {},
      resetTorques: () => {},
      isSleeping: () => false,
      wakeUp: () => {},
      mass: () => 1,
      numColliders: () => 0,
      collider: () => null,
    };
  }
  createCollider() {
    return {
      handle: 0,
      setActiveEvents: () => {},
      setSensor: () => {},
      setCollisionGroups: () => {},
      setSolverGroups: () => {},
      setShape: () => {},
      setTranslation: () => {},
      setTranslationWrtParent: () => {},
      setRotation: () => {},
      setRotationWrtParent: () => {},
      setRestitution: () => {},
      setFriction: () => {},
      parent: () => null,
    };
  }
  removeRigidBody() {}
  removeCollider() {}
  castRay() { return null; }
  castRayAndGetNormal() { return null; }
  getRigidBody() { return null; }
  forEachCollider() {}
  createCharacterController() {
    return {
      computeColliderMovement: () => {},
      computedMovement: () => new Vec3(),
      setSlideEnabled: () => {},
      setMaxSlopeClimbAngle: () => {},
      setMinSlopeSlideAngle: () => {},
      setApplyImpulsesToDynamicBodies: () => {},
      setOffset: () => {},
      numComputedCollisions: () => 0,
      computedCollision: () => null,
    };
  }
  removeCharacterController() {}
  bodies = { getAll: () => [] };
  colliders = { getAll: () => [] };
  free() {}
}

const ActiveEvents = { COLLISION_EVENTS: 1 };
const ActiveCollisionTypes = { DEFAULT: 1, KINEMATIC_FIXED: 2 };
const RigidBodyType = { Dynamic: 0, Fixed: 1, KinematicPositionBased: 2, KinematicVelocityBased: 3 };

class RigidBodyDesc {
  constructor() {}
  setTranslation() { return this; }
  setRotation() { return this; }
  setLinearDamping() { return this; }
  setAngularDamping() { return this; }
  setCanSleep() { return this; }
  setCcdEnabled() { return this; }
  static dynamic() { return new RigidBodyDesc(); }
  static fixed() { return new RigidBodyDesc(); }
  static kinematicPositionBased() { return new RigidBodyDesc(); }
  static kinematicVelocityBased() { return new RigidBodyDesc(); }
}

class ColliderDesc {
  constructor() {}
  setTranslation() { return this; }
  setRotation() { return this; }
  setRestitution() { return this; }
  setFriction() { return this; }
  setMass() { return this; }
  setDensity() { return this; }
  setSensor() { return this; }
  setCollisionGroups() { return this; }
  setSolverGroups() { return this; }
  setActiveEvents() { return this; }
  setActiveCollisionTypes() { return this; }
  static cuboid() { return new ColliderDesc(); }
  static ball() { return new ColliderDesc(); }
  static capsule() { return new ColliderDesc(); }
  static cylinder() { return new ColliderDesc(); }
  static cone() { return new ColliderDesc(); }
  static trimesh() { return new ColliderDesc(); }
  static heightfield() { return new ColliderDesc(); }
  static convexHull() { return new ColliderDesc(); }
}

async function init() {}

module.exports = {
  World,
  Vector3: Vec3,
  Ray,
  EventQueue,
  RigidBodyDesc,
  ColliderDesc,
  ActiveEvents,
  ActiveCollisionTypes,
  RigidBodyType,
  init,
  default: {
    World,
    Vector3: Vec3,
    Ray,
    EventQueue,
    RigidBodyDesc,
    ColliderDesc,
    ActiveEvents,
    ActiveCollisionTypes,
    RigidBodyType,
    init,
  },
};
