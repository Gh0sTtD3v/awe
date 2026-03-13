import { Component3D, DataChangeOpts } from "../../abstract/component-3d";
import LightFactory from "../../../internal/lighting";
import { SET_SHADOW_NEEDS_UPDATE } from "../../../internal/constants";
import { Object3D, Vector3 } from "three";
import { XYZ } from "../types";
import { TransformData } from "../../abstract/component-3d-data";
import { LightingComponentData } from "./lighting-data";

export type { LightingComponentData } from "./lighting-data";

/** @internal */
export interface LightingTransformData extends TransformData {
    lightPosition: XYZ;
    lightDirection: XYZ;
}

/**
 * Internal wrapper that manages the dual directional lights and ambient light.
 * @internal
 */
interface LightingWrapper extends Object3D {
    /** Configuration options forwarded from LightingComponentData. Set to a full {@link LightingComponentData} after initialization. */
    opts: Partial<LightingComponentData>;
    /** Whether the wrapper has been activated (lights added to the scene). */
    active: boolean;
    /** Whether the shadow map needs re-rendering this frame. */
    needsRender: boolean;
    /** Whether the debug light helper is visible. */
    showHelper: boolean;
    /** Disposes all lights, helpers, and event listeners. */
    dispose(): void;
}

/**
 * Provides a directional light with real-time shadow mapping for the scene. The light simulates
 * a distant light source (such as the sun) that casts parallel shadows across the environment.
 *
 * This is a singleton component — only one lighting component can exist per space.
 *
 * The light's direction, position, intensity, and shadow parameters are configured through
 * {@link LightingComponentData}. Changes to data properties (via {@link Component3D.setData})
 * automatically update the light and trigger a shadow map refresh.
 *
 * Objects in the scene that have shadow-casting meshes will cast shadows based on this light's
 * configuration. The shadow quality and coverage are controlled by the {@link LightingComponentData.size | size},
 * {@link LightingComponentData.near | near}, {@link LightingComponentData.far | far}, and
 * {@link LightingComponentData.bias | bias} properties.
 *
 * @remarks
 * Internally, the lighting component manages three separate lights:
 *
 * - **Static shadow light** — A directional light that renders shadow maps for all non-dynamic
 *   scene geometry (terrain, buildings, props, etc.). Its shadow map is only re-rendered when
 *   the component data changes or the scene geometry changes (e.g., objects added/removed),
 *   not every frame. The shadow camera frustum for this light is configured through the
 *   {@link LightingComponentData} shadow properties (`size`, `near`, `far`, `bias`).
 *
 * - **Realtime shadow light** — A second directional light that renders shadow maps exclusively
 *   for dynamic-layer objects (avatars, moving entities). This light updates every frame and
 *   automatically repositions to follow the active camera's frustum, keeping shadows centered
 *   around the player's view. Its shadow parameters are fixed internally.
 *
 * - **Ambient light** — Provides base scene illumination. Its intensity is automatically reduced
 *   when shadow casting is active to maintain balanced lighting and avoid overexposure.
 *
 * This dual-light split is a performance optimization: static shadows avoid expensive full-scene
 * shadow map re-renders each frame, while the realtime shadow light provides responsive per-frame
 * shadows only for moving objects at a much lower cost.
 *
 * @example
 * // Create a directional light with default settings
 * const lighting = await space.components.create({
 *     type: "lighting",
 *     enabled: true,
 *     lightDirection: { x: -1, y: -1, z: -1 },
 *     lightPosition: { x: 200, y: 200, z: 200 },
 *     intensity: 1
 * });
 *
 * @example
 * // Configure lighting with tuned shadow parameters for a large scene
 * const lighting = await space.components.create({
 *     type: "lighting",
 *     enabled: true,
 *     lightDirection: { x: -0.5, y: -1, z: -0.3 },
 *     lightPosition: { x: 300, y: 400, z: 300 },
 *     intensity: 0.8,
 *     bias: -0.003,
 *     near: 100,
 *     far: 1000,
 *     size: 2000
 * });
 *
 * @example
 * // Access the existing lighting component and update its intensity at runtime
 * const lighting = space.components.byType("lighting")[0];
 * lighting.setData({ intensity: 0.5 });
 *
 * @public
 */
export class LightingComponent extends Component3D<LightingComponentData> {
    //
    /** @internal */
    _lighting: LightingWrapper;

    /** @internal */
    protected async init() {
        //
        const prevLighting = this._lighting;

        this._lighting = LightFactory.get(this.data, this.space) as LightingWrapper;

        if (prevLighting) {
            this.space.remove(prevLighting);

            prevLighting.dispose?.();
        }

        if (this._lighting != null) {
            this.space.add(this._lighting);
        }

        this._update3D();
    }

    private tmpDir = new Vector3();

    /**
     * @internal
     */
    getTransformData(): LightingTransformData {
        return {
            lightPosition: this.data.lightPosition,
            lightDirection: this.data.lightDirection,
        };
    }

    /**
     * @internal
     */
    syncWithTransform(isProgress = false) {
        //
        this.getWorldDirection(this.tmpDir);

        const lightPosition = {
            x: this.position.x,
            y: this.position.y,
            z: this.position.z,
        };

        const lightDirection = {
            x: this.tmpDir.x,
            y: this.tmpDir.y,
            z: this.tmpDir.z,
        };

        this.setData({ lightPosition, lightDirection } as any);
    }

    /**
     * @internal
     */
    onDataChange(opts: DataChangeOpts): void {
        this._update3D();
    }

    private _update3D(isProgress = false) {
        //
        this.position.copy(this.data.lightPosition);

        this.tmpDir.copy(this.data.lightDirection).normalize();

        this.lookAt(this.tmpDir.add(this.position));

        this._lighting.opts = this.data;

        if (!isProgress) {
            SET_SHADOW_NEEDS_UPDATE(true);
        }
    }

    /**
     * @internal
     */
    get needsRender() {
        return this._lighting.needsRender;
    }

    /**
     * @internal
     */
    set needsRender(value) {
        this._lighting.needsRender = value;
    }

    /** @internal */
    protected dispose() {
        this._lighting = null as any;
    }
}
