import { Component3D, DataChangeOpts } from "../../abstract/component-3d";
import { SplineFactory } from "../../../internal/spline";
import { SplineComponentData } from "./spline-data";
import { Matrix4, Vector3 } from "three";
import { IS_EDIT_MODE } from "../../../internal/constants";
import Splines from "../../../internal/spline/spline-object";
import emitter from "../../../internal/engine-emitter";
import { EngineEvents } from "../../../internal/engine-events";

export type { SplineComponentData } from "./spline-data";

const _matrix = new Matrix4();

/**
 * @public
 *
 * A component that creates a smooth spline curve in 3D space defined by a series of control points.
 *
 * Splines can be used to define paths for camera movement (via {@link CameraComponent}'s spline behavior),
 * to animate objects along a path using the built-in follower system, or as decorative curves in the scene.
 *
 * The component supports configurable visual properties including **color**, **line width**, and **opacity**.
 * The curve can be **open** or **closed** (looping back to the start).
 *
 * The **follower system** allows spawning component instances that automatically move along the spline
 * path at configurable speeds, with random offset and speed variation for natural-looking movement.
 *
 * The component also provides methods for sampling points at any position along the curve, useful
 * for scripted animations or camera paths.
 *
 * See {@link SplineComponentData} for the data schema used to create a spline component.
 *
 * @example
 * // Create a basic open spline path with green color
 * const spline = await space.components.create({
 *     type: "spline",
 *     position: { x: 0, y: 0, z: 0 },
 *     points: [0, 0, 0, 5, 2, 0, 10, 0, 5, 15, 3, 10],
 *     smoothness: 500,
 *     lineWidth: 2,
 *     opacity: 1,
 *     color: "#00ff00",
 *     closed: false,
 *     display: true
 * });
 *
 * // Sample a point at 50% along the spline
 * const midpoint = spline.getPointAt(0.5);
 *
 * // Get a uniformly-distributed point at 75% distance
 * const threeQuarter = spline.getPoint(0.75);
 *
 * @example
 * // Create a closed loop spline with follower objects
 * const path = await space.components.create({
 *     type: "spline",
 *     points: [0, 0, 0, 5, 0, 0, 5, 0, 5, 0, 0, 5],
 *     closed: true,
 *     smoothness: 1000,
 *     lineWidth: 1,
 *     opacity: 0.5,
 *     color: "#ffffff",
 *     display: false,
 *     preset: { type: "model", url: "https://example.com/bird.glb" },
 *     followerCount: 5,
 *     followerSpeed: 1.5,
 *     followerSpeedVariation: 0.5,
 *     followerOffsetVariation: { x: 1, y: 0.5, z: 1 }
 * });
 */
export class SplineComponent extends Component3D<SplineComponentData> {
    //
    private _splineFactory: SplineFactory = null;

    /**
     * @internal
     */
    _spline: Splines = null;

    private _lastPoints: number[] = null;

    /**
     * @internal
     */
    constructor(opts) {
        //
        super(opts);

        this._splineFactory = opts.splineFactory;
    }

    /** @internal */
    protected async init() {
        //
        this._spline = this._splineFactory.get(this.opts.space, {
            ...this.data,
        });

        // dont display if not in edit mode
        // and display is false

        if (IS_EDIT_MODE != true && this.data.display == false) {
            this._spline.visible = false;
        }

        this._lastPoints = this.data.points;

        await this.setPreset(this.data.preset);

        await this._update3D();

        this.add(this._spline);
    }

    /**
     * @internal
     */
    addPoint(newData) {
        this._spline.addPoint(newData);
    }

    /**
     * @internal
     */
    addPointAtIndex(index) {
        this._spline.addPointAtIndex(index);
    }

    /**
     * @internal
     */
    deletePoint(mesh) {
        this._spline.deletePoint(mesh);
    }

    /**
     * @internal
     */
    deletePointAtIndex(index) {
        //
        this._spline.deletePointAtIndex(index);
    }

    /**
     * @internal
     */
    getSectors() {
        return this._spline.getSectors();
    }

    /**
     * @internal
     */
    async onDataChange(
        opts: DataChangeOpts<SplineComponentData>
    ): Promise<void> {
        if (opts.prev.preset != this.data.preset) {
            //
            await this.setPreset(this.data.preset);
        }

        return await this._update3D();
    }

    private _baseFollower = null;

    private _followers = [];

    private async setPreset(val) {
        this.destroyFollowers();

        if (val == null) {
            return;
        } else {
            this._baseFollower = (await this.space.components.create(val, {
                transient: true,
            })) as any;

            this._followers.push(this._baseFollower);

            this._baseFollower._followOptions = {
                progressionBase: Math.random(),
                followerSpeed:
                    this.data.followerSpeed +
                    Math.random() * this.data.followerSpeedVariation,
                followerOffsetVariation: {
                    x: Math.random() * this.data.followerOffsetVariation.x,
                    y: Math.random() * this.data.followerOffsetVariation.y,
                    z: Math.random() * this.data.followerOffsetVariation.z,
                },
            };
        }
    }

    private destroyFollowers() {
        let i = 0;

        while (i < this._followers.length) {
            this._followers[i].destroy();

            i++;
        }

        this._followers = [];

        if (this._baseFollower != null) {
            this._baseFollower?.destroy();

            this._baseFollower = null;
        }
    }

    /**
     * Returns the 3D position of the control point at the given index.
     *
     * @param index - Zero-based index of the control point.
     * @returns The position of the control point as a Vector3.
     */
    getPointAtIndex(index: number) {
        return this._spline.getPointAtIndex(index);
    }

    /**
     * Returns the interpolated 3D position at parameter `t` along the spline curve.
     *
     * Note: equal increments of `t` do **not** correspond to equal distances along the spline.
     * For uniform distance sampling, use {@link getPoint} or convert with {@link getUtoTmapping}.
     *
     * @param t - Parameter along the spline, from `0` (start) to `1` (end).
     * @returns The interpolated position as a Vector3.
     */
    getPointAt(t: number) {
        return this._spline.getPointAt(t);
    }

    /**
     * Returns the interpolated 3D position at parameter `t` using pre-computed (baked)
     * spline data for better performance.
     *
     * @param t - Parameter along the spline, from `0` (start) to `1` (end).
     * @returns The interpolated position as a Vector3.
     */
    getBakedPointAt(t: number) {
        return this._spline.getBakedPointAt(t);
    }

    /**
     * Converts a uniform distance parameter `u` to the corresponding spline parameter `t`.
     *
     * This is useful for sampling points at equal distances along the spline, since the
     * raw `t` parameter is not uniformly distributed with respect to arc length.
     *
     * @param u - Uniform distance parameter from `0` (start) to `1` (end).
     * @returns The corresponding spline parameter `t` that can be passed to {@link getPointAt}.
     */
    getUtoTmapping(u: number) {
        return this._spline.getUtoTmapping(u);
    }

    /**
     * Returns the interpolated 3D position at a uniform distance parameter `u` along the spline.
     *
     * Unlike {@link getPointAt}, this method maps the parameter uniformly so that equal
     * increments of `u` correspond to approximately equal distances along the curve.
     *
     * @param u - Uniform distance parameter from `0` (start) to `1` (end).
     * @returns The interpolated position as a Vector3.
     */
    getPoint(u: number) {
        return this._spline.getPoint(u);
    }

    private async _update3D() {
        this._spline.lineWidth = this.data.lineWidth;

        this._spline.opacity = this.data.opacity;

        this._spline.color = this.data.color;

        this._spline.smoothness = this.data.smoothness;

        this._spline.closed = this.data.closed || false;

        if (this._lastPoints != this.data.points) {
            //
            this._spline.syncPoints(this.data.points);

            this._lastPoints = this.data.points;
        }

        if (this._baseFollower != null) {
            let i = 0;

            while (i < this.data.followerCount) {
                let follower = this._followers[i];

                if (follower == null) {
                    follower = (await this._baseFollower.duplicate({
                        transient: true,
                    })) as any;

                    this._followers.push(follower);
                }

                follower._followOptions = {
                    progressionBase: Math.random(),
                    followerSpeed:
                        this.data.followerSpeed +
                        Math.random() * this.data.followerSpeedVariation,
                    followerOffsetVariation: {
                        x: Math.random() * this.data.followerOffsetVariation.x,
                        y: Math.random() * this.data.followerOffsetVariation.y,
                        z: Math.random() * this.data.followerOffsetVariation.z,
                    },
                };

                i++;
            }

            while (i < this._followers.length) {
                const g = this._followers.length - 1;

                if (this._followers[g] != null) {
                    this._followers[g].destroy();
                }

                this._followers.splice(g, 1);

                i++;
            }

            if (this._followers.length > 0) {
                this.addFollowerEvents();
            } else {
                this.removeFollowerEvents();
            }
        }
    }

    /**
     * Returns an array of all interpolated points along the spline curve.
     *
     * @returns An array of Vector3 positions representing the full interpolated spline path.
     */
    getPoints() {
        return this._spline.getPoints();
    }

    /**
     * @internal
     *
     * Set world point coordinate at index converted to the local space of the spline
     */
    setWorldPointAtIndex(index, point) {
        let world = point.clone();

        this.worldToLocal(world);

        this._spline.setPointAtIndex(index, world);
    }

    /**
     * @internal
     */
    setPointAtIndex(index, point) {
        this._spline.setPointAtIndex(index, point);
    }

    private followerUpdate = null;

    private addFollowerEvents() {
        if (this.followerUpdate == null) {
            this.followerUpdate = (delta) => {
                let i = 0;

                while (i < this._followers.length) {
                    let follower = this._followers[i];

                    follower._followOptions.progressionBase +=
                        delta * 0.1 * follower._followOptions.followerSpeed;

                    let progress = follower._followOptions.progressionBase % 1;
                    let point = this._spline.getBakedPointAt(progress);

                    point.x +=
                        follower._followOptions.followerOffsetVariation.x;
                    point.y +=
                        follower._followOptions.followerOffsetVariation.y;
                    point.z +=
                        follower._followOptions.followerOffsetVariation.z;

                    follower.position.copy(point);

                    let look =
                        (follower._followOptions.progressionBase + 0.05) % 1;
                    let pointlook = this._spline.getBakedPointAt(look);

                    pointlook.x +=
                        follower._followOptions.followerOffsetVariation.x;
                    pointlook.y +=
                        follower._followOptions.followerOffsetVariation.y;
                    pointlook.z +=
                        follower._followOptions.followerOffsetVariation.z;

                    this._lookAt(follower, point, pointlook);

                    i++;
                }

                // console.log('update ')
            };

            emitter.on(EngineEvents.LATE_UPDATE, this.followerUpdate);
        }
    }

    private _lookAt(object, from, to) {
        _matrix.lookAt(to, from, object.up);

        object.quaternion.setFromRotationMatrix(_matrix);
    }

    private removeFollowerEvents() {
        if (this.followerUpdate != null) {
            emitter.off(EngineEvents.LATE_UPDATE, this.followerUpdate);

            this.followerUpdate = null;
        }
    }

    private _collisionMesh = null;

    /**
     * @internal
     */
    getCollisionMesh() {
        if (this._collisionMesh == null) {
            this._collisionMesh = this._spline.meshLine;
        }

        return this._collisionMesh;
    }

    /** @internal */
    protected dispose() {
        this.destroyFollowers();

        this._splineFactory.disposeAll();

        this._spline = null;
    }

    /**
     * The opacity of the spline line. `0` is fully transparent, `1` is fully opaque.
     */
    set opacity(val) {
        this._spline.opacity = val;
    }

    /**
     * The opacity of the spline line. `0` is fully transparent, `1` is fully opaque.
     */
    get opacity() {
        return this._spline.opacity;
    }
}
