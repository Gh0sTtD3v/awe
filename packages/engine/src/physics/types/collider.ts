import type { Vector3 } from "three";
import type { Component3D } from "../../space/abstract/component-3d";
import type { ColliderOpts } from "./collider-opts";
import type { RigidBody } from "./rigidbody";
import type { Collider as RapierCollider } from "@dimforge/rapier3d";

/**
 * @public
 *
 * Abstract interface for a physics collider.
 */
export interface Collider {
    /**
     * Returns the component this collider belongs to
     */
    readonly component: Component3D;

    /**
     * Returns the parent rigid body this collider is attached to
     */
    readonly parent: RigidBody;

    /**
     * Returns options used to create this collider
     */
    readonly options: ColliderOpts;

    /**
     * Returns the raw underlying collider (physics engine specific)
     */
    readonly raw: RapierCollider;

    /**
     * Returns whether the collider is enabled or not
     */
    enabled: boolean;

    /**
     * The mass of this collider
     */
    mass: number;

    /**
     * The friction coefficient of this collider
     */
    friction: number;

    /**
     * The restitution coefficient of this collider
     */
    restitution: number;

    /**
     * Whether the collider is a sensor or not
     */
    isSensor: boolean;

    /**
     * Set collision groups for this collider
     */
    setGroups(membership: number[], filter: number[]): void;

    /**
     * Dispose this collider
     */
    dispose(wakeUpParent?: boolean): void;

    /**
     * Set the scale/dimensions of this collider.
     * For capsule colliders, dimensions.x is used as diameter and dimensions.y as height.
     * For cube colliders, dimensions are used directly as width, height, depth.
     */
    setScale(dimensions: Vector3): void;

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
    _activeEvents: {
        collision: boolean;
        sensor: boolean;
        any: boolean;
    };

    /**
     * @internal
     */
    _onCollisionChange(collider: Collider, collision: unknown): void;

    /**
     * @internal
     */
    _onEmitCollision(frame: number): void;
}
