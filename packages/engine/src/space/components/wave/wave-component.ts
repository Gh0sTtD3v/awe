// @ts-check

import { Component3D, DataChangeOpts } from "../../abstract/component-3d";
import { WaveFactory } from "../../../internal/wave";
import type WaveMesh from "../../../internal/wave/wave";
import { WaveComponentData } from "./wave-data";
export type { WaveComponentData } from "./wave-data";

/**
 * @public
 *
 * A component that renders an animated wave effect consisting of concentric circular
 * lines that radiate inward or outward from a central point. Useful for creating
 * decorative environmental effects such as energy pulses, sonar rings, or ripple
 * animations. The wave can be customized with color, radius, line width, number of
 * lines, geometry detail, and animation direction.
 *
 * See {@link WaveComponentData} for the data schema used to configure this component.
 *
 * @example
 * ```ts
 * // Basic wave with default settings
 * const wave = await space.components.create({
 *   type: "wave",
 *   position: { x: 0, y: 0, z: 0 },
 * });
 * ```
 *
 * @example
 * ```ts
 * // Customized wave: larger radius, cyan color, outward direction, more lines
 * const wave = await space.components.create({
 *   type: "wave",
 *   position: { x: 10, y: 0.5, z: -5 },
 *   color: 0x00ffff,
 *   radius: 12,
 *   height: 1,
 *   linewidth: 0.2,
 *   lines: 8,
 *   divisions: 150,
 *   direction: 1,
 * });
 *
 * // Adjust properties at runtime
 * wave.color = 0xff00ff;
 * wave.radius = 15;
 * wave.direction = -1;
 * ```
 */
export class WaveComponent extends Component3D<WaveComponentData> {
    private _factory: WaveFactory = null;

    private _wave: WaveMesh = null;

    private _regenerate = false;

    /**
     * @internal
     */
    constructor(opts) {
        super(opts);

        this._factory = opts.waveFactory;
    }

    /**
     * @internal
     */
    async init() {
        //
        this._regenerate = true;

        this.update3D();
    }

    /**
     * @internal
     */

    /**
     * @internal
     */
    onDataChange(opts: DataChangeOpts<WaveComponentData>): void {
        //
        if (
            opts.prev.lines != this.data.lines ||
            opts.prev.divisions != this.data.divisions
        ) {
            this._regenerate = true;
        }

        this.update3D(opts.isProgress);
    }

    /**
     * @internal
     */
    update3D(isProgress = false) {
        const { position, rotation, ...rest } = this.data;

        if (this._regenerate && !isProgress) {
            this.disposeWaveMesh();

            this._regenerate = false;

            this._wave = this._factory.get(rest);

            this.add(this._wave);
        }

        this.position.copy(this.data.position as any);

        this.rotation.set(rotation.x, rotation.y, rotation.z);

        this.color = rest.color;

        this.radius = rest.radius;

        // update height
        // ...

        this.lineWidth = rest.linewidth;

        this.direction = rest.direction;
    }

    /**
     * The radius of the wave effect, controlling how far the concentric circles
     * extend from the center. Must be >= 0.
     */
    get radius(): number {
        return this._wave.radius;
    }

    /**
     * Sets the radius of the wave effect. Must be >= 0.
     */
    set radius(val: number) {
        this._wave.radius = val;
    }

    /**
     * The width of individual wave lines, ranging from 0 to 1.
     */
    get lineWidth(): number {
        return this._wave.lineWidth;
    }

    /**
     * Sets the width of individual wave lines, ranging from 0 to 1.
     */
    set lineWidth(val: number) {
        this._wave.lineWidth = val;
    }

    /**
     * The color of the wave lines as a hex number (e.g. `0x00ffff`).
     */
    get color(): number {
        return this._wave.color;
    }

    /**
     * Sets the color of the wave lines as a hex number (e.g. `0x00ffff`).
     */
    set color(val: number) {
        this._wave.color = val;
    }

    /**
     * The direction of the wave animation. `1` means outward-radiating circles,
     * `-1` means inward-radiating circles.
     */
    get direction(): number {
        return this._wave.direction;
    }

    /**
     * Sets the direction of the wave animation. Use `1` for outward or `-1` for inward.
     */
    set direction(val: number) {
        this._wave.direction = val;
    }

    private disposeWaveMesh() {
        if (this._wave == null) return;

        this.remove(this._wave);

        this._wave?.dispose();

        this._wave = null;
    }

    /**
     * @internal
     */
    dispose() {
        this.disposeWaveMesh();

        super.dispose();
    }
}
