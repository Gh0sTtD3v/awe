// @ts-check
import { Component3D, DataChangeOpts } from "../../abstract/component-3d";
import FontMeshFactory from "../../../internal/font";
import { Color, MeshBasicMaterial } from "three";
import {
    FontFamily,
    TextAlignment,
    TextComponentData,
    TextTransform,
} from "./text-data";
import FontMeshWrapper from "../../../internal/font/instanced/wrapper";
import FontWrapper from "../../../internal/font/wrapper";


export type { TextComponentData } from "./text-data";

const threeColor = new Color();

function toThreeColor(color) {
    threeColor.set(color);

    return [threeColor.r, threeColor.g, threeColor.b];
}

/**
 * @public
 *
 * A component that renders 2D text in the 3D scene.
 *
 * Supports multiple font families (sans-serif and serif), horizontal text
 * alignment, text casing transforms, configurable color and opacity, and
 * optional GPU instanced rendering for efficiently displaying many copies
 * of the same text. The text is rendered as a flat 2D element positioned
 * in 3D space.
 *
 * See {@link TextComponentData} for the data schema used to configure this component.
 *
 * @example
 * // Create a simple white text label
 * const label = await space.components.create({
 *   type: "text",
 *   text: "Hello World",
 *   position: { x: 0, y: 2, z: 0 },
 * });
 *
 * @example
 * // Create styled text with a serif font, centered alignment, and custom color
 * const title = await space.components.create({
 *   type: "text",
 *   text: "Welcome to the Game",
 *   font: "playfair-regular",
 *   align: "center",
 *   textColor: "#ff9900",
 *   opacity: 0.9,
 *   width: 800,
 *   lineHeight: 80,
 *   textTransform: "uppercase",
 *   position: { x: 0, y: 5, z: -3 },
 *   rotation: { x: 0, y: 0, z: 0 },
 * });
 *
 * @example
 * // Create instanced text with billboarding for many repeated labels
 * const marker = await space.components.create({
 *   type: "text",
 *   text: "Checkpoint",
 *   font: "aeonik-medium",
 *   instanced: true,
 *   instancedBillBoard: true,
 *   textColor: "#00ff00",
 *   position: { x: 10, y: 1, z: 0 },
 * });
 */
export class TextComponent extends Component3D<TextComponentData> {
    //
    private _font: FontWrapper | FontMeshWrapper = null;

    private _regenerate = false;

    private _isInstanced(
        font: FontWrapper | FontMeshWrapper
    ): font is FontMeshWrapper {
        return this.data.instanced;
    }

    /** @internal */
    protected async init() {
        if (this.data.instanced) {
            const fontParams = this._getFontParams();

            this._font = await FontMeshFactory.get(fontParams);

            // instanced
            if (this._isInstanced(this._font)) {
                this._font.attachTo(this);
            } else {
                this.add(this._font);
                this._font.name = "fontmesh";
            }

            this._update3D();
        } else {
            this._regenerate = true;

            await this._update3D();
        }
        //
    }

    private async _createFont() {
        //
        const fontParams = this._getFontParams();

        const font = await FontMeshFactory.get(fontParams);

        if (this._font) {
            this._disposeFont();
        }

        this._font = font;

        if (this._isInstanced(this._font)) {
            this._font.attachTo(this);
        } else {
            this.add(this._font);
            this._font.name = "fontmesh";
        }
    }

    private _disposeFont() {
        if (this._font) {
            if (!this._isInstanced(this._font)) {
                this.remove(this._font);
            }
            this._font.dispose();
            this._font = null;
        }
    }

    private update(opts = {}) {
        this._font.update(opts);
    }

    private _getFontParams() {
        return {
            opacity: this.data.opacity ? this.data.opacity : 1,
            font: this.data.font,
            text: this.data.text,
            width: this.data.width,
            align: this.data.align,
            lineHeight: this.data.lineHeight,
            textTransform: this.data.textTransform,
            scale: { x: 1, y: 1, z: 1 },
            color: toThreeColor(this.data.textColor),
            instanced: this.data.instanced ? true : false,
        };
    }

    /**
     * @internal
     */
    onDataChange(opts: DataChangeOpts<TextComponentData>): void {
        // TODO : Add text edition & others
        if (opts.prev.font !== this.data.font) {
            //
            this._regenerate = true;
        }

        this._update3D(opts);
    }

    private _isUpdating = false;

    /** @internal */
    private async _update3D(opts?: DataChangeOpts<TextComponentData>) {
        const isProgress = opts?.isProgress;
        //
        if (this._isInstanced(this._font)) {
            //
            this._font.opacity = this.data.opacity;

            this._font.color = toThreeColor(this.data.textColor);
            //
        } else {
            if (this._isUpdating) {
                return;
            }

            if (this._regenerate && !isProgress) {
                //
                this._isUpdating = true;

                this._regenerate = false;

                await this._createFont();

                this._isUpdating = false;
            }

            if (opts?.prev.opacity !== this.data.opacity) {
                this._font.alpha = this.data.opacity;
            }

            if (opts?.prev.textColor !== this.data.textColor) {
                this._font.color = toThreeColor(this.data.textColor);
            }

            if (
                opts?.prev.width !== this.data.width ||
                opts?.prev.align !== this.data.align ||
                opts?.prev.lineHeight !== this.data.lineHeight
            ) {
                this._font.updateStyle({
                    width: this.data.width,
                    align: this.data.align,
                    lineHeight: this.data.lineHeight,
                });
            }

            if (
                opts?.prev.textTransform !== this.data.textTransform ||
                opts?.prev.text !== this.data.text
            ) {
                this.update({
                    text: this.data.text,
                    textTransform: this.data.textTransform,
                });
            }
        }

        //
    }

    /**
     * @internal
     */
    getCollisionMesh() {
        //
        return this._font.mesh;
    }

    /** @internal */
    protected dispose() {
        //
        this._disposeFont();

        super.dispose();
    }

}
