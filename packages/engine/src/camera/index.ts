import { Frustum, Matrix4, PerspectiveCamera, Vector3, Object3D, Camera as ThreeCamera } from "three";

import emitter from "../internal/engine-emitter";
import { EngineEvents } from "../internal/engine-events";
import Scene from "../internal/scene";

import { GET_RATIO_FOV, FOV, NEAR, FAR } from './constants';


// Default camera position and look-at values
const DEFAULT_POSITION = new Vector3(0, 2.8, 10);
const DEFAULT_LOOKAT = new Vector3(0, 2.8, 0);

// Create default camera
const defaultCamera = new PerspectiveCamera(FOV, 1, NEAR, FAR);
defaultCamera.layers.enableAll();

/**
 * Manages the active camera used for rendering the scene.
 *
 * Provides frustum culling utilities and handles camera resize events.
 * A default PerspectiveCamera is created and used unless replaced via the `current` property.
 *
 * @public
 */
export class Camera {
   
    private _current: ThreeCamera = null;

    /**
     * @internal
     */
    _frustum: Frustum;

    private _projScreenMatrix: Matrix4;

    constructor() {

        this._frustum = new Frustum();
        this._projScreenMatrix = new Matrix4();
        this._addEvents();
        this.current = defaultCamera;
        globalThis["$cam"] = this;
    }

    /**
     * Resets the camera to its default state.
     *
     * Restores the default PerspectiveCamera with default FOV, near/far planes,
     * position, and look-at target.
     */
    reset() {
        // Reset to default camera
        this.current = defaultCamera;

        if (defaultCamera instanceof PerspectiveCamera) {
            // Reset FOV, near, far to defaults
            defaultCamera.fov = FOV;
            defaultCamera.near = NEAR;
            defaultCamera.far = FAR;
            defaultCamera.aspect = 1;

            // Reset position and look-at
            defaultCamera.position.copy(DEFAULT_POSITION);
            defaultCamera.lookAt(DEFAULT_LOOKAT);

            defaultCamera.updateProjectionMatrix();
        }
    }

    private _addEvents() {
        emitter.on(EngineEvents.LATE_UPDATE, this._update);
        emitter.on(EngineEvents.RESIZE, this._resize);
    }

    private _resize = (w: number, h: number) => {
        // Only apply FOV/aspect resize for PerspectiveCamera
        if (this.current instanceof PerspectiveCamera) {
            this.current.fov = GET_RATIO_FOV();
            this.current.aspect = w / h;
            this.current.updateProjectionMatrix();
        }
    }

    private _update = () => {
        this._projScreenMatrix.multiplyMatrices(
            this._current.projectionMatrix,
            this._current.matrixWorldInverse
        );

        this._frustum.setFromProjectionMatrix(this._projScreenMatrix);
    }

    /**
     * Tests whether an object is within the camera's view frustum
     */
    isInFrustum(object: Object3D): boolean {
        return this._frustum.intersectsObject(object);
    }

    /**
     * Sets the active camera used for rendering.
     */
    set current(val: ThreeCamera) {
        // Remove previous camera from scene if it was added
        if (this._current && this._current.parent === Scene) {
            Scene.remove(this._current);
        }

        this._current = val;

        // Add new camera to scene so camera-attached objects render correctly
        if (val && !val.parent) {
            Scene.add(val);
        }

        this._update();
    }

    /**
     * Gets the active camera used for rendering.
     */
    get current(): ThreeCamera {
        return this._current;
    }
}

/**
 * The singleton Camera instance used by the engine.
 */
export default new Camera();
