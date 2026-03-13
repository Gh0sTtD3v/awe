import { PhysicsData } from "../../physics/types/physics-data";
import type { ComponentData } from "../../@types/game";
import { XYZ } from "../components/types";

export type { PhysicsData } from "../../physics/types/physics-data";

/**
 * @public
 *
 * Attach an identifier or a tag to a component, so that it can be easily accessed in
 * the {@link ComponentManager.byId} or {@link ComponentManager.byTag} methods
 */
export interface ScriptData {
    /**
     * Identifier for the script, can be used to access the script in the {@link ComponentManager.byId} method
     */
    identifier?: string;

    /**
     * Tag for the script, can be used to access the script in the {@link ComponentManager.byTag} method
     */
    tag?: string;

    /**
     * @internal
     */
    _isPlayer?: boolean;
}

/**
 * @public
 *
 * Base class for all components data interfaces. It contains the common properties for all components.
 * Extends ComponentData for compatibility with the game data format.
 */
export interface Component3DData extends ComponentData {
    /**
     * @internal - Kit identifier, more specific than base ComponentData
     */
    kit?: "cyber";

    /**
     * Type of the component (model, video, platform, kitbash, etc).
     * Override to allow any type, not just string.
     */
    type: unknown;

    /**
     * Attach an identifier or a tag to a component, so that can be easily accessed in the {@link ComponentManager}
     */
    script?: ScriptData;

    /**
     * Physics paramaters for the component (rigidbody type, collider type, etc)
     */
    collider?: PhysicsData;

    /**
     * @internal
     */
    lock?: LockData;

    _batchId?: string;

    /**
     * @internal
     */
    _index?: number;

    /**
     * @internal
     */
    _hidden?: boolean;

}

export interface LockData {
    position?: boolean;
    rotation?: boolean;
    scale?: boolean;
    lockedBy?: string;
    [key: string]: boolean | string | undefined;
}

/**
 * @public
 *
 * Represents transform data returned by Component3D.getTransformData()
 */
export interface TransformData {
    position?: XYZ;
    rotation?: XYZ;
    scale?: XYZ;
}
