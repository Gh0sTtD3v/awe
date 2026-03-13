// @ts-check
import {
  Component3D,
  DataChangeOpts,
} from "../../abstract/component-3d";
import { CameraFactory } from "../../../internal/camera";
import { CameraComponentData } from "./camera-data";
export type { CameraComponentData } from "./camera-data";
import gsap from "gsap";
import { Matrix4, Vector3, Euler } from "three";
import { SplineComponent } from "../spline/spline-component";

const _matrix = new Matrix4();
/**
 * @public
 *
 * A component that creates and controls a camera in 3D space.
 *
 * The camera supports two primary behavior modes:
 * - **Free mode** (`"free"`): The camera is placed at a static position and rotation.
 * - **Spline mode** (`"splines"`): The camera follows two SplineComponent paths —
 *   one for position and one for look-at target — enabling cinematic camera movements.
 *   Use {@link playSpline} to animate along the splines, or {@link setSplineCameraProgression}
 *   to manually set the progress.
 *
 * The camera also provides a preview window overlay that renders the camera's
 * point of view as a picture-in-picture display, controlled via {@link togglePreview},
 * {@link previewSize}, {@link previewRatio}, and {@link lockMode}.
 *
 * When using spline behavior, this component depends on SplineComponent instances
 * referenced by their IDs in the component data.
 *
 * See {@link CameraComponentData} for the data schema used to create a camera component.
 *
 * @example
 * // Create a free camera at a fixed position
 * const camera = await space.components.create({
 *   type: "camera",
 *   position: { x: 0, y: 5, z: 10 },
 *   rotation: { x: -0.3, y: 0, z: 0 },
 *   behavior: "free",
 *   fov: 60,
 *   previewRatio: 16 / 9,
 *   previewSize: 256,
 *   positionSpline: "",
 *   lookatSpline: "",
 *   splineProgression: 0,
 *   splineDuration: 5,
 *   naturalMovement: false,
 *   naturalMovementForce: 0.5,
 * });
 *
 * // Show the camera preview overlay
 * camera.togglePreview = true;
 *
 * @example
 * // Create a spline-following camera for cinematic movement
 * const cinematic = await space.components.create({
 *   type: "camera",
 *   behavior: "splines",
 *   positionSpline: "spline-position-id",
 *   lookatSpline: "spline-lookat-id",
 *   splineProgression: 0,
 *   splineDuration: 10,
 *   fov: 45,
 *   previewRatio: 16 / 9,
 *   previewSize: 320,
 *   naturalMovement: true,
 *   naturalMovementForce: 0.3,
 * });
 *
 * // Animate the camera along the full spline path over 10 seconds
 * cinematic.playSpline({ from: 0, to: 1, duration: 10 });
 */
export class CameraComponent extends Component3D<CameraComponentData> {
  //
  private _factory: CameraFactory = null;

  /**
   * @internal
   */
  _camera = null;

  private _currentTimer = 0;

  private updateEvent = null;

  private _splineTween = null;

  private _splineProgress = 0;

  private _currentPosition = new Vector3();

  private _currentLookAt = new Vector3();

  private _previousProgress = null;

  /**
   * @internal
   */
  _currentPositionSpline: SplineComponent = null;

  /**
   * @internal
   */
  _currentLookAtSpline: SplineComponent = null;

  /**
   * @internal
   */
  constructor(opts) {
    //
    super(opts);

    this._factory = opts.cameraFactory;
  }

  /**
   * @internal
   */
  async init() {
    //
    this._camera = await this._factory.get(this.opts.space, this.data);

    this.add(this._camera);
  }

  //

  /**
   * @internal
   */
  async _onReady() {
    //
    this.update3D();
  }

  /**
   * @internal
   */
  onDataChange(opts: DataChangeOpts) {
    this.update3D();
  }

  /**
   * @internal
   */
  update3D = () => {
    //
    const { position, rotation, scale, ...opts } = this.data;

    this._camera.previewSize = this.data.previewSize;

    this._camera.ratio = this.data.previewRatio;

    this.fov = this.data.fov;

    this._camera.updateHelper();

    this._splineProgress = this.data.splineProgression;

    // if(this.data.naturalMovement == true && this._getSplinesComponents() != null ){

    //     // this.addEvents()
    // }
    // else{

    //     this.removeEvents()
    // }

    if (this.data.behavior === "splines") {
      //
      this.setSplineCameraProgression(this._splineProgress);
      //
    } else {
      //
      this.position.copy(position as any);

      this.rotation.set(rotation.x, rotation.y, rotation.z);
    }
  };

  // getNaturalMovementData( delta ){

  //     this._currentTimer += delta

  //     tempEuler.copy( this._camera.rotation )

  //     tempEuler.y += Math.sin( this._currentTimer ) * 0.005

  //     tempEuler.x += Math.sin( this._currentTimer + Math.PI * 0.5) * 0.005

  //     return {

  //         position : this._currentPosition,
  //         rotation : tempEuler,
  //     }

  //     // position: this._currentPosition,

  //     // rotation: this._camera.rotation,

  //     // target: this._currentLookAt

  //     // console.log('update', delta )
  // }

  /**
   * @internal
   */
  _getSplinesComponents() {
    //
    if (this.data.behavior !== "splines") return null;

    if (!this.data.positionSpline || !this.data.lookatSpline) return null;

    const positionSpline = this.container.byInternalId(
      this.data.positionSpline
    ) as SplineComponent;

    const lookatSpline = this.container.byInternalId(
      this.data.lookatSpline
    ) as SplineComponent;

    if (this._currentPositionSpline != positionSpline) {
      //
      this._currentPositionSpline?.off("data", this.update3D);

      this._currentPositionSpline = positionSpline;

      this._currentPositionSpline?.on("data", this.update3D);
    }

    if (this._currentLookAtSpline != lookatSpline) {
      //
      this._currentLookAtSpline?.off("data", this.update3D);

      this._currentLookAtSpline = lookatSpline;

      this._currentLookAtSpline?.on("data", this.update3D);
    }

    if (!positionSpline || !lookatSpline) return null;

    return { positionSpline, lookatSpline };
  }

  /**
   * Sets the camera position and orientation along the spline paths at the
   * given normalized progress value.
   *
   * Only effective when {@link CameraComponentData.behavior | behavior} is `"splines"` and both
   * {@link CameraComponentData.positionSpline | positionSpline} and
   * {@link CameraComponentData.lookatSpline | lookatSpline} are configured.
   * Falls back to the camera's static position/rotation if splines are not set.
   *
   * @param progress - Normalized progress along the spline, from `0` (start)
   * to `1` (end).
   *
   * @returns An object with `position` and `rotation`, and optionally `target`
   * (the look-at point) when splines are configured.
   */
  setSplineCameraProgression(progress: number) {
    //
    const splineComponents = this._getSplinesComponents();

    if (splineComponents != null) {
      if (this._previousProgress != progress) {
        let pos = splineComponents.positionSpline.getPointAt(progress);

        let t2 = splineComponents.positionSpline.getUtoTmapping(progress);

        let lookat = splineComponents.lookatSpline.getPoint(t2);

        this.position.copy(pos);

        this.rotation.set(0, 0, 0);

        this._camera.lookAt(lookat);

        this._currentPosition.copy(pos);

        this._currentLookAt.copy(lookat);
      }

      return {
        position: this._currentPosition,

        rotation: this._camera.rotation,

        target: this._currentLookAt,
      };
    }

    // if splines not set
    else {
      //
      this._camera.rotation.set(0, 0, 0);

      this.position.copy(this.data.position as any);

      this.rotation.set(
        this.data.rotation.x,
        this.data.rotation.y,
        this.data.rotation.z
      );

      return {
        position: this.position,

        rotation: this.rotation,
      };
    }
  }

  /** @internal */
  _lookAt(object, from, to) {
    _matrix.lookAt(to, from, object.up);

    object.quaternion.setFromRotationMatrix(_matrix);

    console.log(object.quaternion);
  }

  /**
   * Moves the camera to a specific control point index on the spline paths.
   *
   * Similar to {@link setSplineCameraProgression} but uses discrete point
   * indices rather than normalized progress. Falls back to the camera's
   * static position/rotation if splines are not configured.
   *
   * @param index - The zero-based index of the control point on the spline.
   *
   * @returns An object with `position` and `rotation`, and optionally `target`
   * (the look-at point) when splines are configured.
   */
  setSplineCameraProgressionAtIndex(index: number) {
    //
    const splineComponents = this._getSplinesComponents();

    if (splineComponents != null) {
      //
      var pos = splineComponents.positionSpline.getPointAtIndex(index);

      var lookat = splineComponents.lookatSpline.getPointAtIndex(index);

      this.position.copy(pos);

      this.rotation.set(0, 0, 0);

      this._camera.lookAt(lookat);

      return {
        position: this.position,

        rotation: this._camera.rotation,

        target: lookat,
      };
    }

    // if splines not set
    else {
      //
      this._camera.rotation.set(0, 0, 0);

      this.position.copy(this.data.position as any);

      this.rotation.set(
        this.data.rotation.x,
        this.data.rotation.y,
        this.data.rotation.z
      );

      return {
        position: this.position,

        rotation: this.rotation,
      };
    }
  }

  // this.component.deleteSelectedPoint( parseInt(this.component._currentSelectSplinePoint) )

  /**
   * Animates the camera along the spline paths from a start to end progress
   * value over a specified duration. Stops any currently playing spline
   * animation before starting a new one.
   *
   * Requires {@link CameraComponentData.behavior | behavior} to be `"splines"` and both
   * spline references to be configured.
   *
   * @param opts - Animation options.
   * @param opts.from - Start progress (0–1). Defaults to `0`.
   * @param opts.to - End progress (0–1). Defaults to `1`.
   * @param opts.duration - Animation duration in seconds. Defaults to the
   * component's {@link CameraComponentData.splineDuration | splineDuration} value.
   */
  playSpline({
    from = 0,
    to = 1,
    duration = this.data.splineDuration,
  }: {
    from?: number;
    to?: number;
    duration?: number;
  } = {}) {
    //
    this.stopSpline();

    const splineComponents = this._getSplinesComponents();

    if (!splineComponents) {
      //
      console.error("No spline components to play");

      return;
    }

    const state = {
      progress: from,
    };

    this._splineTween = gsap.to(state, {
      progress: to,
      duration,
      ease: "none",
      onUpdate: () => {
        this.setSplineCameraProgression(state.progress);
      },
    });
  }

  /**
   * Returns the number of control points on the position spline.
   * Returns `0` if spline components are not configured.
   */
  getSplineIndexCount() {
    //
    const splineComponents = this._getSplinesComponents();

    if (splineComponents == null) return 0;

    return splineComponents.positionSpline.getPoints().length;
  }

  /**
   * Stops any currently playing spline animation started by {@link playSpline}.
   */
  stopSpline() {
    //
    this._splineTween?.kill();
  }

  /**
   * The width-to-height display ratio of the camera's preview window.
   * Common values: `4/3` (~1.333), `16/9` (~1.778), `1` (square).
   */
  set previewRatio(ratio) {
    this._camera.ratio = ratio;
  }

  get previewRatio() {
    return this._camera.ratio;
  }

  /**
   * The width of the camera's preview window in pixels.
   */
  set previewSize(size) {
    this._camera.previewSize = size;
  }

  get previewSize() {
    return this._camera.previewSize;
  }

  /**
   * The vertical field of view of the camera in degrees.
   * Updating this value immediately updates the camera's projection matrix.
   */
  set fov(val) {
    this._camera.fov = val;

    this._camera.updateProjectionMatrix();
  }

  get fov() {
    return this._camera.fov;
  }

  /**
   * @internal
   * toggle the helper visualiation of the camera / boolean value
   */

  _toggleHelper(val) {
    this._camera.toggleHelper(val);
  }

  /** @internal */
  _togglePreview = false;

  /**
   * Whether the camera preview window is visible. Set to `true` to show
   * the camera's view as a picture-in-picture style overlay on screen.
   */
  get togglePreview() {
    //
    return this._togglePreview;
  }

  set togglePreview(value) {
    //
    this._togglePreview = value;

    this._camera.togglePreview(value);
  }

  /**
   * Locks the preview window to a specific area of the screen using
   * normalized coordinates. Accepts an `{x, y}` object with values from
   * `0` to `1`, where `{x: 0, y: 0}` is the top-left and `{x: 1, y: 1}`
   * is the bottom-right.
   */
  set lockMode(val) {
    this._camera.lockMode = val;
  }

  get lockMode() {
    return this._camera.lockMode;
  }

  /**
   * @internal
   */

  /** @internal */
  onSelectedChanged(b) {
    if (b == true) {
    } else {
      this.stopSpline();
    }
  }

  /**
   * Returns the current camera state including position, rotation,
   * look-at target, and field of view.
   *
   * @returns An object with `position`, `rotation`, `target`, and `fov`.
   */
  getData = () => {
    return {
      position: this._currentPosition,

      rotation: this._camera.rotation,

      target: this._currentLookAt,

      fov: this._camera.fov,
    };
  };

  // addEvents(){

  //     if(this.updateEvent == null ){

  //         this.updateEvent = this.updateNaturalMovement.bind(this)

  //         emitter.on(Events.LATE_UPDATE, this.updateEvent)
  //     }
  // }

  // removeEvents(){

  //     if( this.updateEvent != null ){

  //         emitter.off(Events.LATE_UPDATE, this.updateEvent)

  //         this.updateEvent = null
  //     }
  // }

  /**
   * @internal
   */
  dispose() {
    this._camera.dispose();
  }
}
