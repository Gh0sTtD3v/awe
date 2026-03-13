// @ts-check

import { Vector3 } from "three";

import { Component3D, DataChangeOpts } from "../../abstract/component-3d";

import { GrassFactory, GrassInstance } from "../../../internal/grass";
import { GrassComponentData } from "./grass-data";
export type { GrassComponentData } from "./grass-data";

const temp = new Vector3();

/**
 * @public
 *
 * A component that renders a procedural grass patch in the scene.
 *
 * The grass uses a dual color palette system that allows for natural-looking color variation
 * across the grass blades. Each palette defines a base color (at the root of the blades)
 * and tip colors (at the top of the blades). The {@link GrassComponentData.colorRepartition}
 * property controls how the two palettes are blended together.
 *
 * Create a grass component using {@link ComponentManager.create} with `type: "grass"`.
 * See {@link GrassComponentData} for all available configuration options.
 *
 * @example
 * ```typescript
 * // Basic grass patch with default colors
 * const grass = await space.components.create({
 *     type: "grass",
 *     position: { x: 0, y: 0, z: 0 },
 *     scale: { x: 5, y: 5, z: 5 },
 *     uBaseColor: 0x313f1b,
 *     uBaseColor2: 0x313f1b,
 *     uTipColor1: 0x9bd38d,
 *     uTipColor2: 0x1f352a,
 *     uTipColor3: 0x82c2a3,
 *     uTipColor4: 0x1f352a,
 *     colorRepartition: 0.5,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Autumn-themed grass with warm tones, blending mostly toward the second palette
 * const autumnGrass = await space.components.create({
 *     type: "grass",
 *     position: { x: 10, y: 0, z: -5 },
 *     scale: { x: 8, y: 8, z: 8 },
 *     uBaseColor: 0x4a3b1f,
 *     uBaseColor2: 0x3d2e15,
 *     uTipColor1: 0xc4a035,
 *     uTipColor2: 0x8b6914,
 *     uTipColor3: 0xd4a940,
 *     uTipColor4: 0x9e7c2a,
 *     colorRepartition: 0.7,
 * });
 *
 * // Later, update colors programmatically
 * autumnGrass.setData({ uTipColor1: 0xdab040, colorRepartition: 0.8 });
 * autumnGrass.updateColors();
 * ```
 */
export class GrassComponent extends Component3D<GrassComponentData> {
    /**
     * @internal
     */
    _factory: GrassFactory = null;

    /**
     * @internal
     */
    _grass: GrassInstance = null;

    /**
     * @internal
     */
    constructor(opts) {
        //
        super(opts);

        this._factory = opts.grassFactory;
    }

    /**
     * @internal
     */
    async init() {
        //
        const { position, rotation, scale, ...opts } = this.data;

        this._grass = this._factory.get(this.data);

        this._grass.wrapper.attachTo(this);

        this.update3D();
    }

    /**
     * @internal
     */
    update3D() {
        //
        const { position, rotation, scale } = this.data;

        this.position.set(position.x, position.y, position.z);

        this.rotation.set(rotation.x, rotation.y, rotation.z);

        this.scale.set(scale.x, scale.y, scale.z);

        this._factory.update(this._grass, this.data);
    }

    /**
     * @internal
     */
    getInstanceWrapper() {
        return this._grass.wrapper;
    }

    //

    /**
     * @internal
     */
    updateFromSource() {
        this._grass.updateFromSource();
    }

    /**
     * @internal
     */
    collision = null;

    /**
     * @internal
     */
    getCollisionMesh() {
        if (this.collision == null) {
            this.collision = this._grass.buildCollisionMesh();

            this.collision.visible = false;

            this.add(this.collision);
        }

        return this.collision;
    }

    /**
     * @internal
     */

    /**
     * @internal
     */
    onDataChange(opts: DataChangeOpts): void {
        //
        this.update3D();
    }

    /**
     * Applies the current color settings from the component data to the rendered grass.
     *
     * Call this method after programmatically changing color properties via
     * {@link Component3D.setData | setData()} to update the visual appearance
     * of the grass patch.
     */
    updateColors() {
        //
        this._factory.update(this._grass, this.data);
    }

    /**
     * @internal
     */
    dispose() {
        this._grass.destroy();
    }


}
