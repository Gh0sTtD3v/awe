// @ts-check

import { Component3D, DataChangeOpts } from "../../abstract/component-3d";
import { Texture } from "three";
import EnvMapFactory from "../../../internal/envmap";
import { FBO_DEBUG } from "../../../internal/constants";
import FBOHelper from "../../../internal/utils/globals/fbo-helper";
import { EnvmapComponentData } from "./envmap-data";

import gsap from "gsap";

export type { EnvmapComponentData } from "./envmap-data";

/**
 * @public
 *
 * The environment map component provides the scene-wide cubemap used for
 * reflections and image-based lighting on all PBR materials. It supports two
 * sourcing modes:
 *
 * - **Scene capture** (`type: "scene"`) — renders a cubemap from the live 3D
 *   scene at an optional world-space position.
 * - **Image** (`type: "image"`) — loads a preset HDR environment image or a
 *   custom user-supplied image.
 *
 * This is a **singleton** component — only one environment map can exist per
 * space and it is always present. Updating the component's
 * {@link EnvmapComponentData.options | options} at runtime automatically
 * regenerates the environment map.
 *
 * @example
 * ```ts
 * // Scene-captured environment map from the default origin
 * const envmap = await space.components.create({
 *   type: "envmap",
 *   options: { type: "scene" },
 * });
 * ```
 *
 * @example
 * ```ts
 * // Scene-captured environment map from a custom position
 * const envmap = await space.components.create({
 *   type: "envmap",
 *   options: {
 *     type: "scene",
 *     position: { x: 5, y: 2, z: 0 },
 *   },
 * });
 * ```
 *
 * @example
 * ```ts
 * // Preset image-based environment map
 * const envmap = await space.components.create({
 *   type: "envmap",
 *   options: { type: "image", imageId: "studio" },
 * });
 * ```
 */
export class EnvmapComponent extends Component3D<EnvmapComponentData> {
    //
    /** @internal */
    _envMap: Texture = null;

    /** @internal */
    protected async init() {
        await this._update3D();
    }

    private _abort: AbortController = null;

    private async _update3D() {
        //
        this._abort?.abort();

        const abort = (this._abort = new AbortController());

        // next frame
        await gsap.delayedCall(0, () => {});

        const envMap = await EnvMapFactory.get(this.data.options, this.space);

        if (abort.signal.aborted) return;

        this._disposeEnvMap();

        this._envMap = envMap;

        this.space.scene.environment = this._envMap;

        if (FBO_DEBUG) {
            FBOHelper.attach(envMap, "envMap");
        }
    }

    /**
     * @internal
     */
    onDataChange(opts: DataChangeOpts): void {
        //
        if (opts.isProgress) return;

        this._update3D();
    }

    private _disposeEnvMap() {
        this._envMap?.dispose();

        // @ts-ignore
        if (this._envMap?.renderTarget) {
            // @ts-ignore
            this._envMap?.renderTarget.dispose();
        }

        if (FBO_DEBUG) {
            FBOHelper.hideAll();
            FBOHelper.detach(this._envMap, "envMap");
        }
    }

    /** @internal */
    protected dispose() {
        this._disposeEnvMap();

        this.space.scene.environment = null;
    }
}
