import { Component3D, DataChangeOpts } from "../../abstract/component-3d";
import ReflectorFactory from "../../../internal/reflector";
import { Assets } from "../../../internal/resources/assets";
import { ReflectorComponentData } from "./reflector-data";

export type { ReflectorComponentData } from "./reflector-data";

/**
 * @public
 *
 * A component that creates a flat reflective surface (mirror floor) in the 3D scene.
 *
 * The reflector renders real-time reflections of the scene onto a configurable plane.
 * Visual options include:
 * - **Color tinting** — tint the reflection with any CSS hex color via {@link ReflectorComponentData.color | color}.
 * - **Opacity** — control transparency from fully transparent to fully opaque via {@link ReflectorComponentData.opacity | opacity}.
 * - **Blur** — soften the reflection for a more realistic look via {@link ReflectorComponentData.blur | blur}.
 * - **Normal mapping** — apply surface texture effects (bumps, ice, bricks, etc.) via {@link ReflectorComponentData.normalmap | normalmap}.
 *
 * The reflector supports position and rotation transforms. Scale is 2D only (x/z),
 * controlling the width and depth of the reflective plane.
 *
 * This is a **singleton** component — only one reflector can exist per space.
 * A reflector and a water component cannot coexist in the same space.
 *
 * See {@link ReflectorComponentData} for the full data schema.
 *
 * @example
 * // Create a basic mirror floor
 * const reflector = await space.components.create({
 *   type: "reflector",
 *   color: "#9fbada",
 *   position: { x: 0, y: 0.01, z: 0 },
 *   scale: { x: 1000, z: 1000 },
 *   opacity: 1,
 *   blur: true,
 *   normalmap: {
 *     enabled: false,
 *   },
 * });
 *
 * @example
 * // Create an ice-like reflective surface with normal mapping
 * const iceFloor = await space.components.create({
 *   type: "reflector",
 *   color: "#bff3ff",
 *   position: { x: 0, y: 0.01, z: 0 },
 *   scale: { x: 500, z: 500 },
 *   opacity: 1,
 *   blur: true,
 *   normalmap: {
 *     enabled: true,
 *     strength: 0.33,
 *     tiles: 0.1,
 *     images: { id: "ice", name: "Ice", image: "", path: "", format: ".jpg" },
 *   },
 * });
 *
 * @example
 * // Create a semi-transparent glass floor
 * const glassFloor = await space.components.create({
 *   type: "reflector",
 *   color: "#838383",
 *   position: { x: 0, y: 0, z: 0 },
 *   scale: { x: 200, z: 200 },
 *   opacity: 0.5,
 *   blur: false,
 *   normalmap: {
 *     enabled: false,
 *   },
 * });
 */
export class ReflectorComponent extends Component3D<ReflectorComponentData> {
    //
    private _reflector = null;

    /** @internal */
    protected async init() {
        //
        this._reflector = ReflectorFactory.getRaw(this.data);

        this.add(this._reflector);

        this._update3D();
    }

    /**
     * @internal
     */
    onDataChange(opts: DataChangeOpts): void {
        // console.log("ReflectorComponent onDataChange", opts);
        this._update3D();
    }

    /**
     * @internal
     */
    syncWithTransform(isProgress = false) {
        //
        this._assignXYZ("position", this.position);

        this._assignXYZ("rotation", this.rotation);
    }

    private _update3D(opts?: DataChangeOpts) {
        //
        this._updateTransform(opts, { position: true, rotation: true });

        this._reflector.scale.x = this.data.scale.x;

        this._reflector.scale.y = this.data.scale.z;

        this._reflector.opacity = this.data.opacity;

        this._reflector.color = this.data.color;

        this._reflector.blur = this.data.blur;

        this._reflector.useNormalMap = this.data.normalmap.enabled;

        this._reflector.normalStrength = this.data.normalmap.strength;

        this._reflector.tiles = this.data.normalmap.tiles;

        if (this.data.normalmap.enabled) {
            //
            const nmap = this.data.normalmap.images;

            const path = Assets.normalMaps[nmap.id] || nmap.path;

            this._reflector.normalMap = path;
        }
    }

    /** @internal */
    protected _onCreateCollisionMesh() {
        return this._reflector;
    }

    /** @internal */
    protected dispose() {
        this._reflector?.dispose();
    }

    /**
     * Public api
     */


}
