import type { Component3D } from "../../space/abstract/component-3d";
import type { Vector3 } from "three";

export const DEFAULT_CHARACTER_CONTROLLER_OPTIONS: CharacterControllerOpts = {
    offset: 0.08,
    applyImpulsesToDynamicBodies: true,
    applyGravity: true,
    maxSlopeClimbAngle: (30 * Math.PI) / 180,
    minSlopeSlideAngle: (20 * Math.PI) / 180,
    characterMass: 1,
    slideEnabled: true,
    snapToGround: 1,
    autoStep: { maxHeight: 0.3, minWidth: 0.2 },
    maxVelocity: 5,
    dampling: 1,
    advancedAnimations: false,
};

/** Options for configuring a character controller */
export interface CharacterControllerOpts {
    /** Skin width around the collider used to avoid numerical issues (default: 0.08) */
    offset: number;
    /** Whether movement impulses are applied to dynamic bodies the character touches (default: true) */
    applyImpulsesToDynamicBodies: boolean;
    /** Whether gravity is applied to the character (default: true) */
    applyGravity: boolean;
    /** Maximum slope angle in radians that the character can climb (default: ~30 degrees) */
    maxSlopeClimbAngle: number;
    /** Minimum slope angle in radians at which the character starts sliding (default: ~20 degrees) */
    minSlopeSlideAngle: number;
    /** Mass of the character used for impulse calculations (default: 1) */
    characterMass: number;
    /** Whether the character slides along obstacles (default: true) */
    slideEnabled: boolean;
    /** Maximum distance to snap the character to the ground (default: 1) */
    snapToGround: number;
    /** Auto-step configuration for climbing small obstacles */
    autoStep: {
        /** Maximum height the character can automatically step up (default: 0.3) */
        maxHeight: number;
        /** Minimum horizontal width of the step surface (default: 0.2) */
        minWidth: number;
    };
    /** Maximum velocity of the character (default: 5) */
    maxVelocity: number;
    /** Damping factor applied to movement (default: 1) */
    dampling: number;
    /** Whether to use advanced animation blending (default: false) */
    advancedAnimations: boolean;
}

/** Abstract collision info returned by character controller */
export interface CharacterCollisionInfo {
    normal1: { x: number; y: number; z: number } | null;
}

/** State returned from character controller update */
export interface CharacterControllerState {
    onFloor: boolean;
    collidesWith: CharacterCollisionInfo[];
}

/** Abstract character controller */
export interface CharacterController {
    update(component: Component3D, velocity: Vector3, dt: number): CharacterControllerState;
}
