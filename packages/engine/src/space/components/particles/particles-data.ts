import { Component3DData } from "../../abstract/component-3d-data";
import { Component3D } from "../../abstract/component-3d";

import { XYZ } from "../types";


/**
 * @public
 *
 * Data specification for {@link ParticlesComponent}. Defines the configuration for a
 * GPU-instanced particle system that emits particles using one of three primitive shapes
 * (plane, cube, or sphere).
 *
 * The particle system supports two lifecycle modes:
 * - **Finite lifespan** (default): Particles are automatically removed after {@link lifeSpan} seconds.
 *   The maximum active particle count is computed as `autoSpawnRate * lifeSpan`.
 * - **Perpetual life**: When {@link perpetualLife} is `true`, particles persist indefinitely.
 *   The pool is capped at {@link maximumSpawn}. Use {@link instantSpawn} to fill the pool immediately.
 *
 * Particles can optionally follow a {@link source} component, inheriting its position and
 * optionally its rotation and scale via {@link attachToSource}, {@link useSourceRotation},
 * and {@link useSourceScale}.
 *
 * Particle appearance and motion are extended through the {@link behaviors} array. Each
 * entry selects a registered behavior by `type` and provides its `options`. Behaviors are
 * processed in array order and can contribute shader plugins, per-particle spawn data,
 * per-frame updates, and editor GUI sections. See {@link ParticlesComponent} for the list
 * of built-in behavior types.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface ParticlesComponentData extends Component3DData {

    /**
     * @internal
     */
    kit?: "cyber";

    /**
     * Component type identifier. Must be `"particles"`.
     */
    type: "particles";

    /**
     * If not provided, an auto-generated id will be assigned.
     */
    id?: string;

    /**
     * Name for the component. Defaults to `""`
     */
    name?: string;

    /**
     * Position of the component in the space. Defaults to `{x: 0, y: 0, z: 0}`
     */
    position?: XYZ;

    /**
     * Rotation of the component in the space. Defaults to `{x: 0, y: 0, z: 0}`
     */
    rotation?: XYZ;

    /**
     * Scale of the component in the space. Defaults to `{x: 1, y: 1, z: 1}`
     */
    scale?: XYZ;

    /**
     * The shape primitive used for each particle.
     *
     * - `"plane"` — Flat quad geometry. Supports billboard mode.
     * - `"cube"` — Box geometry. Billboard is automatically disabled.
     * - `"sphere"` — Impostor sphere rendered on a quad. Billboard is automatically disabled.
     *
     * Defaults to `"plane"`
     */
    primitive?: "plane" | "cube" | "sphere";

    /**
     * Whether particles always face the camera (billboard rendering).
     * Only effective when {@link primitive} is `"plane"`. Setting the primitive to
     * `"cube"` or `"sphere"` automatically disables billboard mode.
     *
     * Defaults to `true`
     */
    billboard?: boolean;

    /**
     * Duration in seconds that each particle lives before being removed.
     * Only used when {@link perpetualLife} is `false`.
     *
     * Range: 0–20. Defaults to `5`
     */
    lifeSpan?: number;

    /**
     * Whether particles are automatically spawned at the rate defined by {@link autoSpawnRate}.
     * When `false`, particles must be spawned manually via {@link ParticlesComponent.spawn}.
     *
     * Defaults to `true`
     */
    autoSpawn?: boolean;

    /**
     * Number of particles spawned per second when {@link autoSpawn} is `true`.
     *
     * Range: 0–100. Defaults to `10`
     */
    autoSpawnRate?: number;

    /**
     * When `true`, particles live forever and are never automatically removed based on
     * {@link lifeSpan}. The maximum number of active particles is instead controlled by
     * {@link maximumSpawn}. Use with {@link instantSpawn} to fill the particle pool
     * immediately on creation.
     *
     * Defaults to `false`
     */
    perpetualLife?: boolean;

    /**
     * When `true` (and {@link perpetualLife} is also `true`), all particles up to
     * {@link maximumSpawn} are spawned immediately upon creation rather than gradually
     * through the auto-spawn mechanism.
     *
     * Has no effect when {@link perpetualLife} is `false`.
     *
     * Defaults to `false`
     */
    instantSpawn?: boolean;

    /**
     * Maximum number of particles that can be alive at once. Only used when
     * {@link perpetualLife} is `true`. When the pool is full, additional spawn
     * calls are silently ignored.
     *
     * Range: 1–1000. Defaults to `100`
     */
    maximumSpawn?: number;

    /**
     * When `true`, particles move with the source component. The particle mesh's
     * world transform is updated each frame to follow the source (or the particles
     * component itself if no {@link source} is set).
     *
     * When `false`, particles are spawned in world space at the source position
     * and remain stationary after spawn.
     *
     * Use {@link useSourceRotation} and {@link useSourceScale} to control which
     * parts of the source transform are inherited.
     *
     * Defaults to `false`
     */
    attachToSource?: boolean;

    /**
     * When `true` (and {@link attachToSource} is also `true`), particles inherit
     * the source component's world rotation in addition to its position.
     *
     * Has no effect when {@link attachToSource} is `false`.
     *
     * Defaults to `false`
     */
    useSourceRotation?: boolean;

    /**
     * When `true` (and {@link attachToSource} is also `true`), particles inherit
     * the source component's world scale in addition to its position.
     *
     * Has no effect when {@link attachToSource} is `false`.
     *
     * Defaults to `false`
     */
    useSourceScale?: boolean;

    /**
     * Whether particles cast shadows onto other objects in the scene.
     *
     * Defaults to `false`
     */
    shadowCast?: boolean;

    /**
     * Whether particles receive shadows from other objects in the scene.
     *
     * Defaults to `false`
     */
    receiveShadow?: boolean;

    /**
     * Optional source component used as the particle emission origin. When set,
     * particles spawn at the source component's world position instead of the
     * particles component's own position.
     *
     * Also used with {@link attachToSource} to make particles follow
     * the source component each frame.
     *
     * When `null`, the particles component itself is used as the emission origin.
     *
     * Defaults to `null`
     */
    source?: Component3D | null;

    /**
     * Ordered list of active particle behaviors. Each entry specifies a
     * registered behavior type and its configuration options.
     * The shape of each `options` object is defined by the behavior class.
     *
     * @example
     * ```ts
     * behaviors: [
     *   { type: "forces", options: { initialVelocity: { x: 0, y: 1, z: 0 }, initialVelocityRange: { x: 0.5, y: 0, z: 0.5 } } },
     *   { type: "scale", options: { animateIn: true, animateOut: true, scale: { x: 1, y: 1, z: 1 } } },
     *   { type: "material", options: { color: 0xff0000, mode: "Standard" } },
     * ]
     * ```
     */
    behaviors?: Array<{ type: string; options: Record<string, any> }>;
}
