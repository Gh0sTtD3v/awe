// @ts-check

import { Box3, Vector3 } from "three";

import { Component3D } from "../../abstract/component-3d";
import { DialogFactory } from "../../../internal/dialog";
import { DialogComponentData } from "./dialog-component-data";
export type { DialogComponentData } from "./dialog-component-data";

const temp = new Vector3();

/**
 * @public
 *
 * A component that renders a text dialog panel in 3D space.
 *
 * The dialog displays text content with a configurable background color, opacity,
 * width, and text alignment. By default, the dialog uses billboard mode so it
 * always faces the camera, making it ideal for speech bubbles, floating labels,
 * in-world notifications, or tutorial prompts.
 *
 * The dialog also supports scripted text display via {@link showScript}, which
 * renders text lines sequentially with a typewriter animation effect — useful for
 * NPC dialogue sequences or narrative cutscenes.
 *
 * See {@link DialogComponentData} for the full data schema.
 *
 * @example
 * // Create a basic billboard dialog with static text
 * const dialog = await space.components.create({
 *   type: "text",
 *   position: { x: 0, y: 2, z: 0 },
 *   text: "Hello, adventurer!",
 *   billboard: true,
 *   backgroundColor: 0x000000,
 *   backgroundOpacity: 0.8,
 *   width: 3,
 *   align: "center",
 * });
 *
 * @example
 * // Create a non-billboard dialog fixed in the world
 * const sign = await space.components.create({
 *   type: "text",
 *   position: { x: 5, y: 1.5, z: 0 },
 *   rotation: { x: 0, y: Math.PI / 4, z: 0 },
 *   text: "Welcome to the village",
 *   billboard: false,
 *   backgroundColor: 0x333333,
 *   backgroundOpacity: 1,
 *   width: 4,
 *   align: "left",
 * });
 *
 * @example
 * // Use showScript for a typewriter-style NPC dialogue sequence
 * const npcDialog = await space.components.create({
 *   type: "text",
 *   position: { x: 0, y: 2.5, z: -1 },
 *   text: "",
 *   billboard: true,
 *   backgroundColor: 0x1a1a2e,
 *   backgroundOpacity: 0.9,
 *   width: 5,
 *   align: "left",
 * });
 *
 * const controller = new AbortController();
 *
 * await npcDialog.showScript({
 *   texts: [
 *     "Greetings, traveler.",
 *     "The road ahead is dangerous.",
 *     "Take this sword — you'll need it.",
 *   ],
 *   speed: 0.03,
 *   delay: 1.5,
 *   signal: controller.signal,
 * });
 */
export class DialogComponent extends Component3D<DialogComponentData> {
    private _factory: DialogFactory = null;

    private _dialog = null;

    /**
     * @internal
     */
    constructor(opts) {
        super(opts);
        this._factory = opts.dialogFactory;
    }

    /**
     * @internal
     */
    async init() {
        const { position, rotation, scale, ...opts } = this.data;

        this.data.parent = this;
        this._dialog = await this._factory.get(this.opts.space, this.data);

        this.position.copy(position as any);
        this.scale.copy(scale as any);
        this.add(this._dialog);

        if (this.data.billboard) {
            this.onBeforeRender = () => {
                this.rotation.set(0, 0, 0);
                this._dialog.rotation.set(0, 0, 0);
            };
        } else {
            this.rotation.set(rotation.x, rotation.y, rotation.z);
        }
    }

    /**
     * Displays a sequence of text lines in the dialog with a typewriter animation effect.
     *
     * Each line in `args.texts` is rendered character by character at the rate specified by
     * `args.speed`. After a line finishes, the dialog waits for `args.delay` seconds before
     * starting the next line. The returned promise resolves when all lines have been displayed,
     * or resolves early if the operation is cancelled via `args.signal`.
     *
     * @param args - The arguments for the script.
     * @param args.texts - An array of text strings to display sequentially.
     * @param args.speed - The typewriter speed in seconds per character (e.g., `0.03` for fast, `0.08` for slow).
     * @param args.delay - The pause in seconds between finishing one line and starting the next.
     * @param args.signal - An {@link AbortSignal} that can be used to cancel the script mid-display.
     * @returns A promise that resolves when all text lines have finished displaying,
     *   or resolves early if cancelled via the abort signal.
     */
    showScript(args) {
        return this._dialog.showScript(args);
    }

    /**
     * @internal
     */
    protected _getBBoxImp(bbox: Box3) {
        //
        const size = this._dialog.text.size;

        bbox.min.set(size.x.min, size.y.min, 0);
        bbox.max.set(size.x.max, size.y.max, 0);

        return bbox;
    }

    /**
     * Returns the dimensions of the rendered dialog panel.
     *
     * @returns A {@link Vector3} where `x` is the width, `y` is the height, and `z` is `0`.
     */
    getDimensions() {
        const dimensions = new Vector3();

        const size = this._dialog.text.size;

        dimensions.set(size.width, size.height, 0);

        return dimensions;
    }

    /**
     * @internal
     */
    dispose() {
        this._dialog.dispose();
    }
}
