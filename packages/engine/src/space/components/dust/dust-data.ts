import { Object3D } from "three";
import { XYZ } from "../types";
import { Component3DData } from "../../abstract/component-3d-data";



/**
 * @public
 *
 * Data specification for {@link DustComponent}. Defines the configuration for a dust
 * particle trail that follows a target Object3D as it moves through the scene. The dust
 * effect creates small particle puffs that spawn behind the target when it moves beyond
 * a minimum distance threshold, then fade away at a configurable rate.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface DustComponentData extends Component3DData {

    /**
     * @internal
     */
    kit?: "cyber";

    /**
     * Component type identifier. Must be `"cloud"`.
     */
    type: "cloud";

    /**
     * if not provided, an auto id will be generated
     */
    id?: string;

    /**
     * name for the component. Defaults to ""
     */
    name?: string;

    /**
     * The Three.js Object3D that the dust trail follows. This is a required property.
     * As the target moves through the scene, dust particles spawn at its position
     * (offset by {@link spawnSource}). Typically this is a player character, avatar,
     * or vehicle mesh.
     */
    target: Object3D;

    /**
     * Minimum distance (in world units) the target must travel before new dust particles
     * are spawned. Lower values cause dust to appear more frequently during movement.
     * Defaults to 2
     */
    spawnDistance?: number,

    /**
     * Speed at which dust particles fade out and disappear. Higher values make the dust
     * vanish more quickly; lower values make it linger longer. Defaults to 1.5
     */
    decaySpeed?: number,

    /**
     * Amount of random horizontal offset (on the X and Z axes) applied to dust particle
     * spawn positions. Higher values spread the dust particles over a wider area around
     * the target. Defaults to 0.9
     */
    randomXZ?: number,

    /**
     * Positional offset of the dust spawn source relative to the target object's origin.
     * Use this to shift where particles appear — for example, lowering the Y value to
     * spawn dust at ground level beneath a character. Defaults to {x: 0, y: 0, z: 0}
     */
    spawnSource?: XYZ,

    /**
     * Scale multiplier for the dust particles. Larger values produce bigger dust puffs.
     * Defaults to 1
     */
    scale?: number,

    /**
     * Optional condition controlling whether dust is spawned. When set to `null` (the
     * default), dust spawns unconditionally whenever the target moves beyond the
     * {@link spawnDistance} threshold. Defaults to null
     */
    condition? : null,

}
