import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ, XY } from "../types";

/**
 * @public
 *
 * Data specification for {@link CameraComponent}.
 *
 * Configures a camera in 3D space that can either be positioned freely at a
 * fixed location or animated along spline paths for cinematic camera movements.
 *
 * The camera supports a preview window overlay that shows the camera's point of
 * view, useful for previewing camera angles and spline animations.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface CameraComponentData extends Component3DData {
    /**
     * @internal
     */
    kit?: "cyber";

    /**
     * The component type discriminator. Must be `"camera"`.
     */
    type: "camera";

    /**
     * if not provided, an auto id will be generated
     */
    id?: string;

    /**
     * name for the component. Defaults to ""
     */
    name?: string;

    /**
     * Position of the component in the space. Defaults to {x: 0, y: 0, z: 0}
     */
    position?: XYZ;

    /**
     * Rotation of the component in the space, in radians. Defaults to {x: 0, y: 0, z: 0}
     */
    rotation?: XYZ;

    /**
     * Scale of the component in the space. Defaults to {x: 1, y: 1, z: 1}
     */
    scale?: XYZ;

    /**
     * Width-to-height display ratio of the camera's preview window.
     * Common values: `4/3` (~1.333), `16/9` (~1.778), `1` (square).
     * Defaults to `4/3`.
     */
    previewRatio: number;

    /**
     * Width of the camera's preview window in pixels.
     * Defaults to `256`.
     */
    previewSize: number;

    /**
     * Locks the preview window to a specific area of the screen using
     * normalized coordinates. Values range from `0` to `1` for both axes,
     * where `{x: 0, y: 0}` is the top-left and `{x: 1, y: 1}` is the
     * bottom-right. When omitted, the preview window is not locked to
     * a fixed position.
     */
    lockMode?: XY;

    /**
     * The camera behavior mode:
     * - `"free"` — The camera is placed at a fixed position and rotation in the scene.
     * - `"splines"` — The camera follows position and look-at spline paths for
     *   cinematic movement. Requires {@link positionSpline} and {@link lookatSpline}
     *   to be set.
     * - `"third-person"` — Third-person camera behavior.
     * - `"first-person"` — First-person camera behavior.
     *
     * Defaults to `"free"`.
     */
    behavior: "free" | "splines" | "third-person" | "first-person";

    /**
     * The ID of a SplineComponent to use as the camera's position path.
     * Only used when {@link behavior} is `"splines"`. Should reference a
     * different spline than {@link lookatSpline}.
     */
    positionSpline: string;

    /**
     * The ID of a SplineComponent to use as the camera's look-at target path.
     * Only used when {@link behavior} is `"splines"`. Should reference a
     * different spline than {@link positionSpline}.
     */
    lookatSpline: string;

    /**
     * Initial normalized progress along the spline paths, from `0` (start)
     * to `1` (end). Only relevant when {@link behavior} is `"splines"`.
     * Defaults to `0`.
     */
    splineProgression: number;

    /**
     * Duration in seconds for the spline animation playback when using
     * {@link CameraComponent.playSpline}. Only relevant when {@link behavior}
     * is `"splines"`. Defaults to `5`.
     */
    splineDuration: number;

    /**
     * Whether to apply subtle natural camera sway when following splines,
     * simulating handheld camera movement. Only relevant when {@link behavior}
     * is `"splines"`. Defaults to `false`.
     */
    naturalMovement: boolean;

    /**
     * Intensity of the natural camera movement effect, from `0` (none) to `1`
     * (maximum). Only relevant when {@link naturalMovement} is `true`.
     * Defaults to `0.5`.
     */
    naturalMovementForce: number;

    /**
     * Vertical field of view of the camera in degrees.
     * Valid range: `1` to `180`. Defaults to `60`.
     */
    fov: number;
}
