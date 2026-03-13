import type {
    KinematicCharacterController,
    CharacterCollision,
    Collider as RapierRawCollider,
    RigidBody as RapierRawRigidBody,
} from "@dimforge/rapier3d";
import type RapierPhysicsEngine from "./rapier-physics-engine";
import { RapierCollider } from "./rigidbody/collider";
import { CharacterCollisionEvent } from "./character-collision-event";
import { IntersectionEvent } from "./intersection-event";
import { Component3D } from "../../space/abstract/component-3d";
import { Vector3 } from "three";
import type {
    CharacterController,
    CharacterControllerOpts,
    CharacterControllerState,
} from "../types/character-controller";
import { DEFAULT_CHARACTER_CONTROLLER_OPTIONS } from "../types/character-controller";

/**
 * Rapier-specific implementation of CharacterController.
 *
 * @internal
 */
export class RapierCharacterController implements CharacterController {
    private _rapierController: KinematicCharacterController = null;

    private _engine: RapierPhysicsEngine;

    private _opts: CharacterControllerOpts = structuredClone(DEFAULT_CHARACTER_CONTROLLER_OPTIONS);

    constructor(engine: RapierPhysicsEngine, opts: Partial<CharacterControllerOpts> = {}) {
        this._engine = engine;

        Object.assign(this._opts, opts);

        this._opts.autoStep = Object.assign(
            DEFAULT_CHARACTER_CONTROLLER_OPTIONS.autoStep,
            opts.autoStep
        );

        this._rapierController = this._engine.world.createCharacterController(
            this._opts.offset
        );

        this._rapierController.setApplyImpulsesToDynamicBodies(
            this._opts.applyImpulsesToDynamicBodies
        );

        this._rapierController.setCharacterMass(this._opts.characterMass);

        this._rapierController.setSlideEnabled(this._opts.slideEnabled);

        this._rapierController.enableSnapToGround(this._opts.snapToGround);

        this._rapierController.enableAutostep(
            this._opts.autoStep.maxHeight,
            this._opts.autoStep.minWidth,
            false
        );
    }

    update(
        component: Component3D,
        velocity: Vector3,
        dt: number,
    ): CharacterControllerState {
        const rawc = component.rigidBody.colliders[0].raw as RapierRawCollider;

        this._rapierController.computeColliderMovement(
            rawc,
            velocity,
            null,
            null,
            (collider) => {
                if (collider.isSensor()) return false;
                const cyberCollider = RapierCollider.getFromRaw(collider);
                return (
                    cyberCollider == null ||
                    !cyberCollider.parent.component?.data?.["_IS_PLAYER"]
                );
            }
        );

        const rpos = (component.rigidBody.raw as RapierRawRigidBody).translation();
        const cpos = rawc.translation();

        let correctedMovement = this._rapierController.computedMovement();

        if (!component.rigidBody.translationLock[0]) {
            rpos.x += correctedMovement.x;
            cpos.x += correctedMovement.x;
        }

        if (!component.rigidBody.translationLock[1]) {
            rpos.y += correctedMovement.y;
            cpos.y += correctedMovement.y;
        }

        if (!component.rigidBody.translationLock[2]) {
            rpos.z += correctedMovement.z;
            cpos.z += correctedMovement.z;
        }

        // @ts-ignore
        component.rigidBody.position = rpos;

        component.rigidBody.quaternion = component.quaternion;

        const onFloor = this._rapierController.computedGrounded();

        let result: CharacterControllerState = { onFloor, collidesWith: [] };

        const hitSensors = this._castSensors(component.rigidBody.raw as RapierRawRigidBody, cpos, rawc);

        const computedCollisions =
            this._rapierController.numComputedCollisions();

        const now = Date.now();

        for (let i = 0; i < computedCollisions; i++) {
            let collision = this._rapierController.computedCollision(i);

            const collider = collision?.collider;

            result.collidesWith.push(collision);

            this._castCallback(collider, now, collision, dt, component.collider as RapierCollider);

            this._updateCollisionState(collider, component.collider as RapierCollider, collision);
        }

        // sensors only
        let c = 0;

        while (c < hitSensors.length) {
            const collider = hitSensors[c];
            this._castCallback(collider, now, null, dt, component.collider as RapierCollider);

            this._updateIntersectionState(collider, component.collider as RapierCollider);

            c++;
        }

        return result;
    }

    private _castCallback(collider, now, collision = null, delta, playerCollider) {
        const component = collider?._parent?.userData?.mesh;

        const collisionCallback = component?.onCollisionCallback;

        if (collisionCallback && collider._lastCollided != now) {
            collider._lastCollided = now;

            collisionCallback(this, collision, delta, playerCollider, collider);
        }
    }

    private _castSensors(rigidbody, rpos, collider) {
        const hitSensors = [];

        this._engine.world.intersectionsWithShape(
            rpos,
            rigidbody.rotation(),
            collider.shape,
            (handle) => {
                hitSensors.push(handle);
                return true;
            },
            null,
            null,
            null,
            null,
            (collider) => {
                return collider.isSensor();
            }
        );

        return hitSensors;
    }

    private _updateCollisionState(
        collider: RapierRawCollider,
        playerCollider: RapierCollider,
        collision: CharacterCollision
    ) {
        // @ts-ignore
        const cyberCollider = RapierCollider.getFromRaw(collider);

        if (playerCollider._activeEvents.collision) {
            playerCollider._onCollisionChange(
                cyberCollider,
                new CharacterCollisionEvent(
                    false,
                    playerCollider.component,
                    cyberCollider.component,
                    collision,
                    0
                )
            );
        }

        if (cyberCollider._activeEvents.collision) {
            cyberCollider._onCollisionChange(
                playerCollider,
                new CharacterCollisionEvent(
                    true,
                    cyberCollider.component,
                    playerCollider.component,
                    collision,
                    0
                )
            );
        }
    }

    private _updateIntersectionState(
        collider: RapierRawCollider,
        playerCollider: RapierCollider
    ) {
        // @ts-ignore
        const cyberCollider = RapierCollider.getFromRaw(collider);

        if (playerCollider._activeEvents.sensor) {
            playerCollider._onCollisionChange(
                cyberCollider,
                new IntersectionEvent(
                    playerCollider.component,
                    cyberCollider.component,
                    0
                )
            );
        }

        if (cyberCollider._activeEvents.sensor) {
            cyberCollider._onCollisionChange(
                playerCollider,
                new IntersectionEvent(
                    cyberCollider.component,
                    playerCollider.component,
                    0
                )
            );
        }
    }
}
