import type { RigidBody } from "./rigidbody";
import type { PhysicsOpts } from "./index";
import type { Collider } from "./collider";
import type { Component3D } from "../../space/abstract/component-3d";
import type { CharacterController, CharacterControllerOpts } from "./character-controller";
import type { RayColliderToi } from "@dimforge/rapier3d";

/**
 * Raycast options
 */
export interface RaycastOptions {
    origin: { x: number; y: number; z: number };
    direction: { x: number; y: number; z: number };
    maxDistance?: number;
    ignoreRigidbody?: RigidBody;
    filterFlags?: number;
    shouldRaycast?: (collider: Collider) => boolean;
    /** Whether to include the collider the ray starts inside of (default: true) */
    solid?: boolean;
}

/**
 * Raycast result
 */
export interface RaycastResult {
    point: { x: number; y: number; z: number };
    distance: number;
    colliderName?: string;
    /** The component that was hit */
    component?: Component3D;
    /** Raw physics-engine-specific hit result */
    raw: RayColliderToi;
}

/**
 * @public
 *
 * Abstract interface for a physics engine.
 */
export interface PhysicsEngine {
    /**
     * Current simulation frame number
     */
    readonly frame: number;

    /**
     * Whether the physics engine is active
     */
    active: boolean;

    /**
     * Initialize the physics engine
     */
    init(): Promise<void>;

    /**
     * Dispose the physics engine and release resources
     */
    dispose(): void;

    /**
     * Create a new rigid body
     */
    createRigidBody(opts: PhysicsOpts): RigidBody;

    /**
     * Remove a rigid body from the simulation
     */
    removeRigidBody(body: RigidBody): void;

    /**
     * Perform a raycast in the physics world
     */
    physicsRaycast(ray: RaycastOptions): RaycastResult | null;

    /**
     * Create a character controller for kinematic rigid bodies
     */
    createCharacterController(opts?: Partial<CharacterControllerOpts>): CharacterController;
}
