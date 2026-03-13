import type { Vector3, Quaternion } from "three";
import type { Component3D } from "../../space/abstract/component-3d";
import type { Collider } from "./collider";
import type { XYZ } from "../../@types/types";
import type { RigidBodyOpts } from "./rigidbody-opts";
import type { RigidBody as RapierRigidBody } from "@dimforge/rapier3d";

/**
 * @public
 *
 * Abstract interface for a physics rigid body.
 */
export interface RigidBody {
    /**
     * Returns the component that owns this rigid body
     */
    readonly component: Component3D;

    /**
     * Returns the colliders attached to this rigid body
     */
    readonly colliders: Collider[];

    /**
     * Returns options used to create this rigid body
     */
    readonly options: RigidBodyOpts;

    /**
     * Returns the raw underlying rigid body (physics engine specific)
     */
    readonly raw: RapierRigidBody;

    /**
     * Is this rigid body enabled?
     */
    enabled: boolean;

    /**
     * Position of the rigid body
     */
    position: Vector3;

    /**
     * Quaternion (rotation) of the rigid body
     */
    quaternion: Quaternion;

    /**
     * Is this rigid body fixed?
     */
    readonly isFixed: boolean;

    /**
     * Is this rigid body dynamic?
     */
    readonly isDynamic: boolean;

    /**
     * Is this rigid body kinematic?
     */
    readonly isKinematic: boolean;

    /**
     * Translation lock state [x, y, z]
     */
    translationLock: [boolean, boolean, boolean];

    /**
     * Rotation lock state [x, y, z]
     */
    rotationLock: [boolean, boolean, boolean];

    /**
     * Teleport the rigid body to a new position and/or rotation
     */
    teleport(position: Vector3, quaternion: Quaternion): void;

    /**
     * Add a force to the rigid body
     */
    addForce(force: Partial<XYZ>, relativePoint?: XYZ): void;

    /**
     * Apply an impulse to the rigid body
     */
    applyImpulse(impulse: Partial<XYZ>, relativePoint?: XYZ): void;

    /**
     * Reset all forces applied to the rigid body
     */
    resetForces(): void;

    /**
     * Reset all velocities of the rigid body
     */
    resetVelocities(): void;

    /**
     * Returns the linear velocity of the rigid body
     */
    readonly linearVelocity: Vector3;

    /**
     * Returns the angular velocity of the rigid body
     */
    readonly angularVelocity: Vector3;

    /**
     * Set linear damping on the rigid body
     */
    setLinearDamping(damping: number): void;

    /**
     * Set angular damping on the rigid body
     */
    setAngularDamping(damping: number): void;

    /**
     * Reset the rigid body to its initial state
     */
    reset(): void;

    /**
     * Dispose this rigid body
     */
    dispose(): void;

    /**
     * @internal
     */
    __updateActiveEvents(): void;

    /**
     * @internal
     */
    _wasDisposed: boolean;

    /**
     * @internal
     */
    _autoSyncTransform: boolean;

    /**
     * @internal
     */
    _interpolate: boolean;
}
