import Augmented from "../../../internal/events/augmented";
import { Component3D } from "../../abstract/component-3d";
import emitter from "../../../internal/engine-emitter";
import { EngineEvents } from "../../../internal/engine-events";
import { getBestLookAtPosition } from "../../../internal/utils/three";
import {
    Crowd,
    CrowdAgent,
    CrowdAgentParams,
    CrowdParams,
} from "recast-navigation";
import {
    Box3,
    BufferGeometry,
    Line,
    LineBasicMaterial,
    MathUtils,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    SphereGeometry,
    Vector3,
    Raycaster,
} from "three";
import { NavmeshComponent } from "./navmesh-component";
import { disposeObject3D } from "../../../internal/utils/dispose";
import Camera from "../../../camera";
import { XYZ } from "../../../@types/types";

/**
 * Configuration for a navmesh agent's physical properties and movement capabilities.
 *
 * @public
 */
export interface AgentParams {
    /**
     * The agent's collision radius, used for obstacle avoidance and agent separation.
     * Defaults to `0.5`.
     */
    radius: number;

    /**
     * The agent's height. Defaults to `1.5`.
     */
    height: number;

    /**
     * Maximum acceleration rate. Higher values make the agent reach max speed faster.
     * Defaults to `20`.
     */
    maxAcceleration: number;

    /**
     * Maximum movement speed in world units per second. Defaults to `8`.
     */
    maxSpeed: number;
}

const DEFAULT_AGENT_PARAMS: AgentParams = {
    radius: 0.5,
    height: 1.5,
    maxAcceleration: 20,
    maxSpeed: 8,
};

const DEFAULT_CROWD_PARAMS: CrowdParams = {
    maxAgentRadius: 2.0,
    maxAgents: 1000,
};

function getDimensions(obj: Object3D): Vector3 {
    if (obj instanceof Component3D) {
        //
        return obj.getDimensions();
    } else {
        //
        let box = new Box3();
        box.setFromObject(obj);
        return box.getSize(new Vector3());
    }
}

/**
 * Manages a group of {@link NavmeshAgent} instances navigating on a shared navmesh.
 *
 * The crowd handles crowd simulation including obstacle avoidance, path optimization,
 * and agent separation. By default it auto-updates every frame. Disable
 * {@link NavmeshCrowd.autoUpdate | autoUpdate} to manually control update timing via
 * {@link NavmeshCrowd.update | update()}.
 *
 * Obtain an instance from {@link NavmeshComponent.crowd} (default crowd) or
 * {@link NavmeshComponent.createCrowd} (custom crowd).
 *
 * @public
 */
export class NavmeshCrowd extends Augmented {
    //
    private _autoUpdate = false;

    /**
     * @internal
     */
    _recastCrowd: Crowd;

    /** Current crowd configuration parameters (maxAgents, maxAgentRadius). */
    params: CrowdParams;

    /**
     * @internal
     */
    constructor(
        public component: NavmeshComponent,
        opts: Partial<CrowdParams> = {}
    ) {
        //
        super();

        this.params = Object.assign({}, DEFAULT_CROWD_PARAMS, opts);

        this.autoUpdate = true;

        component.subscribe(() => {
            //
            this._disposeCrowd();

            this._createCrowd();

            this.emit("crowd", this._recastCrowd);
        });
    }

    private _createCrowd() {
        //
        if (this.component._navMesh == null) {
            return;
        }

        this._recastCrowd = new Crowd(
            this.component._navMesh,
            DEFAULT_CROWD_PARAMS
        );

        this._addEvents();
    }

    private _disposeCrowd() {
        //
        this._removeEvents();
        this._recastCrowd?.destroy();
        this._recastCrowd = null;
    }

    /**
     * @internal
     */
    _subscribe(cb: (crowd: Crowd) => void) {
        //
        if (this._recastCrowd != null) {
            cb(this._recastCrowd);
        }

        return this.on("crowd", cb);
    }

    /** The space this crowd belongs to. */
    get space() {
        return this.component?.space;
    }

    /**
     * Manually advances the crowd simulation by the given delta time.
     * Only needed when {@link NavmeshCrowd.autoUpdate | autoUpdate} is `false`.
     *
     * @param dt - Delta time in seconds since the last update
     * @param timeSinceLastFrame - Optional time since last frame for sub-stepping
     * @param maxSubSteps - Optional maximum number of sub-steps per update
     */
    update(dt: number, timeSinceLastFrame?: number, maxSubSteps?: number) {
        //
        if (this._recastCrowd == null) {
            console.error("Crowd was destroyed");
            return;
        }
        this._recastCrowd.update(dt, timeSinceLastFrame, maxSubSteps);

        for (let i = 0; i < this._agents.length; i++) {
            let agent = this._agents[i];
            agent._handleUpdate(dt);
        }

        this.emit("update", dt);
    }

    private _agents: NavmeshAgent[] = [];

    /**
     * Adds a new agent to this crowd.
     *
     * @param target - A starting `Vector3` position, or an `Object3D` host whose
     *   position/rotation will be automatically updated as the agent moves
     * @param params - Optional agent parameters overriding defaults
     * @returns The created {@link NavmeshAgent}
     */
    addAgent(target: Vector3 | Object3D, params: Partial<AgentParams> = {}) {
        //
        const agent = new NavmeshAgent({
            crowd: this,
            target,
            params,
        });

        this._agents.push(agent);

        return agent;
    }

    /**
     * Removes an agent from this crowd and disposes its navigation resources.
     *
     * @param agent - The agent to remove
     * @returns `false` if the agent was not found in this crowd
     */
    removeAgent(agent: NavmeshAgent) {
        //
        let idx = this._agents.indexOf(agent);

        if (idx === -1) {
            return false;
        }

        this._agents.splice(idx, 1);

        agent._disposeAgent();
    }

    /**
     * Finds the closest navigable point on the navmesh to the given world position.
     *
     * @param position - The world position to query
     * @param target - Optional vector to write the result into (avoids allocation)
     * @returns The closest navigable point, or `null` if the crowd is not initialized
     */
    findClosestPoint(position: Vector3, target = new Vector3()) {
        if (this._recastCrowd == null) return null;
        let res = this._recastCrowd.navMeshQuery.findClosestPoint(position);
        if (res.success) {
            return copyVec3(target, res.point);
        }
        return null;
    }

    /**
     * Finds a random navigable point anywhere on the navmesh.
     *
     * @param target - Optional vector to write the result into
     * @returns A random navigable point, or `null` if the crowd is not initialized
     */
    findRandomPoint(target?: Vector3): Vector3;
    /**
     * Finds a random navigable point within a given radius of a position.
     *
     * @param position - The center position to search around
     * @param radius - The search radius
     * @param target - Optional vector to write the result into
     * @returns A random navigable point within the radius, or `null` if the crowd is not initialized
     */
    findRandomPoint(
        position: Vector3,
        radius: number,
        target?: Vector3
    ): Vector3;
    findRandomPoint(...args) {
        if (this._recastCrowd == null) return null;

        let res;
        let target: Vector3;

        if (args[0] instanceof Vector3 && typeof args[1] === "number") {
            //
            target = args[2] ?? new Vector3();
            res = this._recastCrowd.navMeshQuery.findRandomPointAroundCircle(
                args[0],
                args[1]
            );
        } else {
            //
            target = args[0] ?? new Vector3();
            res = this._recastCrowd.navMeshQuery.findRandomPoint();
        }

        if (res.success) {
            return copyVec3(target, res.randomPoint);
        }
        return null;
    }

    /**
     * Finds the nearest navigation polygon on the navmesh to the given position.
     *
     * @param position - The world position to query
     * @returns The nearest polygon result with `nearestRef` and `nearestPoint`, or `null` if not found
     */
    getPoly(position: Vector3) {
        if (this._recastCrowd == null) return null;
        let res = this._recastCrowd.navMeshQuery.findNearestPoly(position);
        if (!res.success) {
            return null;
        }
        return res;
    }

    /**
     * Computes a navigation path between two world positions on the navmesh.
     *
     * @param start - The starting world position
     * @param end - The target world position
     * @param debugPolys - When `true`, includes polygon references in the result for debugging
     * @returns An object containing:
     *   - `points`: Array of `Vector3` waypoints along the path
     *   - `nearStart`: The start position snapped to the navmesh
     *   - `nearEnd`: The end position snapped to the navmesh
     *   - `polys`: Polygon references (only when `debugPolys` is `true`)
     *   - `direct`: Whether the path is a straight line
     *
     *   Returns `null` if no path can be found or the crowd is not initialized.
     */
    computePath(start: Vector3, end: Vector3, debugPolys = false) {
        if (this._recastCrowd == null) return null;

        let ps = this.getPoly(start);
        if (ps == null) return null;
        let pe = this.getPoly(end);
        if (pe == null) return null;

        // console.log("start", ps.nearestRef, "end", pe.nearestRef);

        let ret = {
            polys: [] as number[],
            points: [] as Vector3[],
            nearStart: copyVec3(new Vector3(), ps.nearestPoint),
            nearEnd: copyVec3(new Vector3(), pe.nearestPoint),
            direct: false,
        };

        // do a direct raycast first if y is close enough

        if (false && Math.abs(ps.nearestPoint.y - pe.nearestPoint.y) < 0.1) {
            let rr = this._recastCrowd.navMeshQuery.raycast(
                ps.nearestRef,
                ps.nearestPoint,
                pe.nearestPoint
            );

            if (rr.success && rr.t > 0.99) {
                ret.direct = true;
                ret.points = [start.clone(), end.clone()];
                ret.polys = debugPolys ? [ps.nearestRef, pe.nearestRef] : null;
                return ret;
            }
        }

        if (debugPolys) {
            let r = this._recastCrowd.navMeshQuery.findPath(
                ps.nearestRef,
                pe.nearestRef,
                ps.nearestPoint,
                pe.nearestPoint
            );

            if (!r.success) {
                return null;
            }

            for (let i = 0; i < r.polys.size; i++) {
                //
                ret.polys.push(r.polys.get(i));
            }
        }

        let res = this._recastCrowd.navMeshQuery.computePath(start, end);

        if (!res.success) {
            return null;
        }

        ret.points = res.path.map((p) => copyVec3(new Vector3(), p));

        console.log("computePath", start, end, ret);

        return ret;
    }

    /** All agents currently in this crowd. */
    get agents() {
        return this._agents;
    }

    private _handleUpdate = (dt: number) => {
        if (this._recastCrowd == null || !this.autoUpdate) return;
        this.update(dt);
    };

    private _addEvents() {
        emitter.on(EngineEvents.UPDATE, this._handleUpdate);
    }

    private _removeEvents() {
        emitter.off(EngineEvents.UPDATE, this._handleUpdate);
    }

    /**
     * Registers a callback called after each crowd update with the delta time.
     *
     * @param cb - Callback receiving the delta time in seconds
     * @returns An unsubscribe function
     */
    onUpdate(cb: (dt: number) => void) {
        return this.on("update", cb);
    }

    /**
     * Whether the crowd automatically updates each frame. Defaults to `true`.
     * Set to `false` to manually control updates via {@link NavmeshCrowd.update | update()}.
     */
    get autoUpdate() {
        return this._autoUpdate;
    }

    set autoUpdate(v) {
        if (this._autoUpdate === v) return;
        this._autoUpdate = v;

        if (v) {
            this._addEvents();
        } else {
            this._removeEvents();
        }
    }

    dispose() {
        this.removeAllListeners();
        this._disposeCrowd();
        this.component = null;
    }
}

const R_AGENT_STATES = {
    Invalid: 0,
    Walking: 1,
    OffMesh: 2,
};

const raycaster = new Raycaster();

type AgentState = "Idle" | "Moving" | "Invalid";

function copyVec3(target: Vector3, src: { x: number; y: number; z: number }) {
    return target.copy(src as any);
}

function vec3Eq(a: Vector3 | null, b: Vector3 | null) {
    if (a == b) return true;
    if (a == null || b == null) return false;
    return a.equals(b);
}

const PI_TIMES_TWO = Math.PI * 2;

const STOP_SPEED_SQ = 0.01 * 0.01;

export function lerpRadians(start: number, end: number, t: number) {
    let result: number;
    let diff = end - start;
    if (diff < -Math.PI) {
        // lerp upwards past PI*2
        end += PI_TIMES_TWO;
        result = MathUtils.lerp(start, end, t);
        if (result >= PI_TIMES_TWO) {
            result -= PI_TIMES_TWO;
        }
    } else if (diff > Math.PI) {
        // lerp downwards past 0
        end -= PI_TIMES_TWO;
        result = MathUtils.lerp(start, end, t);
        if (result < 0) {
            result += PI_TIMES_TWO;
        }
    } else {
        // straight lerp
        result = MathUtils.lerp(start, end, t);
    }

    return result;
}

const _v1 = new Vector3();
const _v2 = new Vector3();

/**
 * A single navigable entity on the navmesh with autonomous pathfinding.
 *
 * A `NavmeshAgent` can be attached to a host `Object3D` (e.g. an avatar or model component)
 * to drive its position and rotation automatically as the agent moves along the navmesh.
 * When no host is provided, the agent tracks a position on the navmesh without affecting
 * any scene object.
 *
 * **States:** An agent is always in one of three states:
 * - `"Idle"` — the agent is stationary and has no active navigation target.
 * - `"Moving"` — the agent is actively navigating toward a target position.
 * - `"Invalid"` — the agent has entered an invalid navigation state (e.g. fell off the navmesh).
 *
 * **How to obtain:** Create agents via {@link NavmeshComponent.createAgent} (uses the default crowd)
 * or {@link NavmeshCrowd.addAgent} (uses a specific crowd).
 *
 * **Host behavior:** When attached to an `Object3D`, the agent automatically updates the host's
 * position and rotation each frame as it moves. When the host is an avatar component, the
 * Y-rotation offset is adjusted automatically so the avatar faces the direction of movement.
 *
 * **Radius/height inference:** When created with a host and no explicit `radius` or `height`,
 * values are inferred from the host's bounding box.
 *
 * @example
 * ```ts
 * const agent = navmesh.createAgent(avatarComponent, {
 *     radius: 0.5,
 *     height: 1.8,
 *     maxSpeed: 6
 * });
 *
 * // Navigate to a position
 * agent.moveTo(new Vector3(10, 0, 5), {
 *     callback: (reached) => {
 *         console.log(reached ? "Arrived!" : "Move cancelled");
 *     }
 * });
 *
 * // Listen for target reached events
 * agent.onTargetReached((pos) => {
 *     console.log("Reached", pos);
 * });
 *
 * // Teleport the agent instantly
 * agent.teleport(new Vector3(0, 0, 0));
 *
 * // Read agent parameters
 * console.log(agent.maxSpeed, agent.radius, agent.state);
 * ```
 *
 * @public
 */
export class NavmeshAgent extends Augmented {
    /**
     * @internal
     */
    _recastAgent: CrowdAgent;

    private host: Object3D;
    private _rotYOffset = 0;

    /**
     * @internal
     */
    STATES = R_AGENT_STATES;

    private _state: AgentState = "Idle";
    private _moveCallback: (reached: boolean) => void;

    private _startPos = new Vector3();
    private _currentPos = new Vector3();
    private _targetPos = new Vector3();
    private _isVecReq = false;

    private _prevPos = new Vector3();
    private _isMoving = false;

    private _curRotY = 0;

    private _stopDistSq = 0;
    private _stopSpeedSq = STOP_SPEED_SQ;

    private _debug = false;

    /**
     * @internal
     */
    _crowd: NavmeshCrowd;

    /**
     * @internal
     */
    _params: AgentParams;

    /**
     * @internal
     */
    constructor(opts: {
        crowd: NavmeshCrowd;
        target: Vector3 | Object3D;
        params: Partial<AgentParams>;
    }) {
        //
        super();

        const { crowd, target, params } = opts;

        this._crowd = crowd;

        this.host = target instanceof Object3D ? target : null;

        this._rotYOffset =
            this.host instanceof Component3D &&
            this.host.componentType === "avatar"
                ? Math.PI
                : 0;

        let position =
            this.host !== null ? this.host.position : (target as Vector3);

        this._startPos.copy(position);

        if (
            this.host != null &&
            (params.radius == null || params.height == null)
        ) {
            //
            let dims = getDimensions(this.host);
            params.radius ??= Math.max(dims.x / 2, dims.z / 2, 0.3);
            params.height ??= Math.max(dims.y, 1.5);
        }

        let crowdParams: Partial<CrowdAgentParams> = {
            ...DEFAULT_AGENT_PARAMS,
            ...params,
        };

        crowdParams.radius = Math.min(
            crowdParams.radius,
            this._crowd.params.maxAgentRadius
        );

        crowdParams.collisionQueryRange = crowdParams.radius * 12;
        crowdParams.pathOptimizationRange = crowdParams.radius * 30;
        /*
         Enable all flags
 
             DT_CROWD_ANTICIPATE_TURNS = 1
             DT_CROWD_OBSTACLE_AVOIDANCE = 2
             DT_CROWD_SEPARATION = 4
             DT_CROWD_OPTIMIZE_VIS = 8       Use #dtPathCorridor::optimizePathVisibility() to optimize the agent path.
             DT_CROWD_OPTIMIZE_TOPO = 16     Use dtPathCorridor::optimizePathTopology() to optimize the agent path.
 
             cf https://github.com/recastnavigation/recastnavigation/blob/455a019e7aef99354ac3020f04c1fe3541aa4d19/DetourCrowd/Include/DetourCrowd.h#L185-L192
         */
        crowdParams.updateFlags = 0b11111;
        crowdParams.obstacleAvoidanceType = 3;
        crowdParams.separationWeight = 2;

        this._params = crowdParams as AgentParams;

        this._crowd._subscribe(() => {
            //
            this._disposeAgent();

            this._createAgent();
        });
    }

    private _calcStopDist() {
        const r = this.radius;
        this._stopDistSq = Math.max((r * r) / 8, 0.01);
    }

    private _createAgent() {
        //
        if (this._crowd?._recastCrowd == null) return;

        const position = this.findClosestPoint(this._startPos);

        if (position != null) {
            //
            this._startPos.copy(position);
        } else {
            //
            console.error("Failed to find closest point");
        }

        this._recastAgent = this._crowd._recastCrowd.addAgent(
            this._startPos,
            this._params
        );

        this._calcStopDist();
    }

    /**
     * @internal
     */
    _disposeAgent() {
        //
        if (this._recastAgent == null) return;
        if (this._crowd?._recastCrowd == null) return;

        this._crowd._recastCrowd.removeAgent(this._recastAgent);

        this._recastAgent = null;
    }

    private _pathMesh: Line;

    private _updatePathMesh() {
        //
        if (
            this._debug == false ||
            this.state !== "Moving" ||
            !this._path?.length
        )
            return;

        this._disposePathMesh();

        const path = this._path.slice();

        path.forEach((v) => {
            v.y += 0.05;
        });

        const geometry = new BufferGeometry().setFromPoints(path);

        const material = new LineBasicMaterial({
            color: 0xff0000,
            linewidth: 2,
        });

        this._pathMesh = new Line(geometry, material);
        this.space.add(this._pathMesh);

        if (this._polys.length) {
            this._drawPolys(this._polys, 0xff0000);
        }
    }

    private _disposePathMesh() {
        if (this._pathMesh == null) return;
        this._pathMesh.removeFromParent();
        disposeObject3D(this._pathMesh);

        if (this._polyDrawer != null) {
            this._polyDrawer.clear();
        }

        this._curPolys.forEach((poly) => {
            this._crowd.component._navMesh.setPolyFlags(poly, 1);
        });

        this._curPolys = [];
    }

    private _polyDrawer: import("@recast-navigation/three").DebugDrawer;
    private _curPolys: number[] = [];

    private async _drawPolys(polys: number[], color: number) {
        //
        if (this._polyDrawer == null) {
            const { DebugDrawer } = await import("@recast-navigation/three");
            this._polyDrawer = new DebugDrawer();
            this._crowd.component.debugHelper.add(this._polyDrawer);
        }

        this._curPolys.forEach((poly) => {
            this._crowd.component._navMesh.setPolyFlags(poly, 1);
        });

        polys.forEach((poly) => {
            this._crowd.component._navMesh.setPolyFlags(poly, 1 << 9);
        });

        this._curPolys = polys;

        this._polyDrawer.clear();
        this._polyDrawer.drawNavMeshPolysWithFlags(
            this._crowd.component._navMesh,
            1 << 9,
            color
        );
    }

    private _invokeMoveCallback(reached: boolean) {
        //
        if (this._moveCallback == null) return;
        const callback = this._moveCallback;
        this._moveCallback = null;

        try {
            callback(reached);
        } catch (e) {
            console.error(e);
        }
    }

    private _setState(
        state: AgentState,
        start: Vector3,
        target: Vector3,
        isVecReq: boolean,
        callback?: (reached: boolean) => void
    ) {
        if (
            state === this._state &&
            vec3Eq(start, this._currentPos) &&
            vec3Eq(target, this._targetPos) &&
            isVecReq === this._isVecReq
        )
            return;

        if (state === "Moving" && this._moveCallback != null) {
            // if we reached the target, then the callback should've been
            // already invoked by update event
            this._invokeMoveCallback(false);
        }

        this._state = state;

        if (this._state === "Moving") {
            this._moveCallback = callback;
        }

        this._startPos.copy(start);
        this._prevPos.copy(start);
        this._currentPos.copy(start);
        this._targetPos = this._targetPos.copy(target);
        this._isVecReq = isVecReq;

        this.emit("state", state, target);
        this._updatePathMesh();
    }

    //#region Internal callbacks
    private _v3Dir = new Vector3();

    /**
     * @internal
     */
    _handleUpdate(dt: number) {
        //
        switch (this._recastAgent.state()) {
            //
            case R_AGENT_STATES.Walking:
                //
                this._prevPos.copy(this._currentPos);

                copyVec3(this._currentPos, this._recastAgent.position());

                if (this._state === "Moving") {
                    //
                    let stop =
                        this._currentPos.distanceToSquared(this._targetPos) <
                        this._stopDistSq;

                    // if is on straight path, check also if we're past the target
                    // bcz sometimes obstacle avoidance can steer the agent away from the target
                    if (!stop && this._isVecReq) {
                        //

                        let targetVec = _v1
                            .subVectors(this.target, this._startPos)
                            .setY(0);
                        let currentVec = _v2
                            .subVectors(this._currentPos, this._startPos)
                            .setY(0);

                        currentVec.projectOnVector(targetVec);

                        stop = currentVec.lengthSq() > targetVec.lengthSq();
                    }

                    if (!stop) {
                        //
                        const velocity = copyVec3(
                            this._velocity,
                            this._recastAgent.velocity()
                        );

                        this._v3Dir.copy(velocity).setY(0).normalize();

                        this._curRotY =
                            Math.atan2(this._v3Dir.x, this._v3Dir.z) +
                            this._rotYOffset;

                        //
                    } else {
                        //
                        this._invokeMoveCallback(true);

                        this.teleport(this._currentPos);

                        this.emit("targetReached", this._currentPos);
                    }
                }
                break;
            default:
                this._setState("Invalid", this._currentPos, null, false);
                break;
        }

        this._updateHost(dt);

        this.emit("update", dt);
    }

    private _projectPoint(point: Vector3) {
        //
        const meshes = this._crowd.component.collisions;

        raycaster.ray.origin.copy(point);
        raycaster.ray.origin.y += 1;
        raycaster.ray.direction.set(0, -1, 0);

        let intersects = raycaster.intersectObjects(meshes, true);

        if (intersects.length > 0) {
            //
            return intersects[0];
        }

        return null;
    }

    private _updateHost(dt: number) {
        //
        if (this.host == null) return;

        this.host.position.copy(this.position);

        switch (this.state) {
            //
            case "Moving":
                //
                // fix y position, sometimes the navmesh can be slightly off
                // raycast to find the ground
                // const meshes = this._crowd.component.collisions;

                // raycaster.ray.origin.copy(this._currentPos);
                // raycaster.ray.origin.y += 1;
                // raycaster.ray.direction.set(0, -1, 0);

                // let intersects = raycaster.intersectObjects(meshes, true);
                const intersect = this._projectPoint(this._currentPos);

                if (intersect != null) {
                    //
                    this.host.position.y = intersect.point.y;
                }

                const alpha = 1.0 - Math.pow(0.001, dt);

                this.host.rotation.y = lerpRadians(
                    this.host.rotation.y,
                    this.yRotation,
                    alpha
                );

                break;
            default:

            //
        }
    }
    //#endregion

    /**
     * Registers a callback fired each frame with the delta time.
     *
     * @param cb - Callback receiving the delta time in seconds
     * @returns An unsubscribe function
     */
    onUpdate(cb: (dt: number) => void) {
        return this.on("update", cb);
    }

    /**
     * Registers a callback fired when the agent reaches its move target.
     *
     * @param cb - Callback receiving the position the agent reached
     * @returns An unsubscribe function
     */
    onTargetReached(cb: (target: Vector3) => void) {
        return this.on("targetReached", cb);
    }

    get space() {
        return this._crowd.space;
    }

    get debug() {
        return this._debug;
    }

    set debug(v) {
        if (this._debug === v) return;
        this._debug = v;
        if (!v) {
            if (this._pathMesh) {
                this._pathMesh.removeFromParent();
                disposeObject3D(this._pathMesh);
            }
            if (this._debugTarget) {
                this._debugTarget.removeFromParent();
                disposeObject3D(this._debugTarget);
            }
            this._polyDrawer?.clear();
        }
    }

    /** Current agent state — `"Idle"`, `"Moving"`, or `"Invalid"`. */
    get state() {
        return this._state;
    }

    /** The agent's current world position on the navmesh. */
    get position() {
        return this._currentPos;
    }

    /** The agent's current movement target position, or the current position if idle. */
    get target() {
        return this._targetPos;
    }

    /** The agent's current Y-axis rotation in radians, derived from its velocity direction. */
    get yRotation() {
        return this._curRotY;
    }

    /** Whether the agent is actively navigating to a target. */
    get isMoving() {
        return this.state === "Moving";
    }

    private _nextTarget = new Vector3();

    /** The next intermediate waypoint the agent is heading toward. */
    get nextTargetInPath() {
        const nextTarget = this._isVecReq
            ? this._targetPos
            : this._recastAgent.nextTargetInPath();
        return copyVec3(this._nextTarget, nextTarget);
    }

    private _velocity = new Vector3();

    /** The agent's current velocity vector. */
    get velocity() {
        return this._velocity;
    }

    /**
     * Computes a navigation path from the agent's current position to the target position.
     *
     * @param end - The target world position
     * @param debugPolys - When `true`, includes polygon references in the result for debugging
     * @returns The computed path result, or `null` if no path can be found.
     *   See {@link NavmeshCrowd.computePath} for the result shape.
     */
    computePath(end: Vector3, debugPolys = false) {
        //
        return this._crowd.computePath(this.position, end, debugPolys);
    }

    /**
     * Removes the agent from its crowd and releases all resources.
     * After disposal, the agent should not be used.
     */
    dispose() {
        this.removeAllListeners();
        this._crowd?.removeAgent(this);
        this._disposePathMesh();
        //this._polyDrawer?.removeFromParent();
        //disposeObject3D(this._polyDrawer);
    }

    /**
     * Finds the closest navigable point on the navmesh to the given world position.
     *
     * @param position - The world position to query
     * @returns The closest navigable point, or `null` if not found
     */
    findClosestPoint(position: Vector3) {
        return this._crowd.findClosestPoint(position);
    }

    /**
     * Finds a random navigable point within the given radius of the agent's current position.
     *
     * @param radius - The search radius around the agent
     * @param target - Optional vector to write the result into (avoids allocation)
     * @returns A random navigable point, or `null` if not found
     */
    findRandomPoint(radius: number, target?: Vector3) {
        return this._crowd.findRandomPoint(this.position, radius, target);
    }

    //#region paramaters

    /**
     * Gets the full set of agent parameters (radius, height, maxAcceleration, maxSpeed).
     */
    get parameters() {
        let params = this._recastAgent.parameters();
        return {
            radius: params.radius,
            height: params.height,
            maxAcceleration: params.maxAcceleration,
            maxSpeed: params.maxSpeed,
        };
    }

    /**
     * Sets the full set of agent parameters, replacing all current values.
     * Any omitted properties revert to their defaults.
     */
    set parameters(params: Partial<AgentParams>) {
        this._recastAgent.setParameters({
            ...DEFAULT_AGENT_PARAMS,
            ...params,
        });
    }

    /**
     * Partially updates agent parameters, merging with current values.
     * Only the provided properties are changed; others remain unchanged.
     *
     * @param params - The parameters to update
     */
    updateParameters(params: Partial<AgentParams>) {
        this._recastAgent.updateParameters(params);
    }

    /** The agent's collision radius. */
    get radius() {
        return this._recastAgent.radius;
    }

    set radius(value: number) {
        this._recastAgent.radius = value;
        this._calcStopDist();
    }

    /** The agent's height. */
    get height() {
        return this._recastAgent.height;
    }

    set height(value: number) {
        this._recastAgent.height = value;
    }

    /** The agent's maximum speed in world units per second. */
    get maxSpeed() {
        return this._recastAgent.maxSpeed;
    }

    set maxSpeed(value: number) {
        this._recastAgent.maxSpeed = value;
    }

    /** The agent's maximum acceleration rate. */
    get maxAcceleration() {
        return this._recastAgent.maxAcceleration;
    }

    set maxAcceleration(value: number) {
        this._recastAgent.maxAcceleration = value;
    }
    //#endregion

    //#region steering

    /**
     * Instantly moves the agent to the given position, resetting its pathfinding state to Idle.
     *
     * @param position - The world position to teleport to
     */
    teleport(position: Vector3) {
        this._path = [];
        this._recastAgent.teleport(position);
        this._setState("Idle", position, position, false);
    }

    private _path = [] as Vector3[];
    private _polys = [] as number[];

    /**
     * Navigates the agent to the target position.
     *
     * Finds the nearest navigable polygon to the target and requests a move.
     * The agent's state transitions to `"Moving"` on success.
     *
     * @param position - The target world position to navigate to
     * @param opts - Optional configuration
     * @param opts.callback - Fires with `true` when the target is reached, or `false` if
     *   the move is cancelled by another `moveTo` or {@link NavmeshAgent.reset | reset()} call
     * @returns `true` if the move was successfully initiated, `false` if no navigable polygon was found
     */
    moveTo(
        position: Vector3,
        opts: { callback?: (reached: boolean) => void } = {}
    ) {
        //
        // let res = this.computePath(position, false);
        // this._path = res.points;
        // this._polys = res.polys;
        // let success = false;
        // if (false && res.direct) {
        //     const vel = new Vector3().subVectors(res.points[1], res.points[0]);
        //     vel.setY(0).normalize();
        //     vel.multiplyScalar(this.maxSpeed);

        //     success = this._recastAgent.requestMoveVelocity(vel);
        // } else {

        if (this._debug) this._getDebugTarget().position.copy(position);

        const query = this._crowd._recastCrowd.navMeshQuery;

        let res = query.findNearestPoly(position, {
            halfExtents: this._queryHalfExts,
        });

        if (!res.success || res.nearestRef == 0) {
            console.error("Failed to find nearest poly");
            return false;
        }

        let notFound = !res.success || res.nearestRef == 0;

        if (notFound) {
            console.error("Failed to find nearest poly");
            return false;
        }

        if (this._debug) this._drawPolys([res.nearestRef], 0xff0000);

        let success = this._recastAgent.requestMoveTarget(res.nearestPoint);

        if (success) {
            //
            const targetPos = copyVec3(new Vector3(), res.nearestPoint);

            this._setState(
                "Moving",
                this._currentPos,
                targetPos,
                false,
                opts.callback
            );
        }

        return success;
    }

    _debugTarget: Mesh;
    _queryHalfExts = new Vector3(2, 2, 2);

    private _getDebugTarget() {
        //
        if (this._debugTarget == null) {
            //
            this._debugTarget = new Mesh(
                new SphereGeometry(0.1),
                new MeshBasicMaterial({
                    color: 0xff0000,
                    wireframe: true,
                    depthTest: false,
                })
            );

            this._debugTarget.renderOrder = 1000;

            this._crowd.component.space.add(this._debugTarget);
        }

        return this._debugTarget;
    }

    /**
     * Navigates the agent toward a target {@link Component3D}, computing a suitable
     * look-at position based on the camera angle. Useful for moving an agent to
     * face another component.
     *
     * @param target - The target component to navigate toward
     * @param opts - Optional configuration
     * @param opts.offset - Distance offset from the target
     * @param opts.callback - Fires when the target is reached
     */
    moveToTarget(
        target: Component3D,
        opts: { offset?: number; callback?: () => void } = {}
    ) {
        //
        const position = getBestLookAtPosition(target, Camera.current as any, opts);

        let intersect = this._projectPoint(position);

        console.log("projection  distance", intersect.distance);

        if (intersect != null && intersect.distance < 20) {
            position.y = intersect.point.y;
        } else {
            position.y -= this._queryHalfExts.y;
        }

        this.moveTo(position, { callback: opts.callback });
    }

    /**
     * Cancels any active movement and returns the agent to Idle state.
     * If a `moveTo` callback is pending, it fires with `false`.
     */
    reset() {
        this._path = [];
        this._recastAgent.resetMoveTarget();
        this._setState("Idle", this._currentPos, this._currentPos, false);
    }
    //#endregion
}
