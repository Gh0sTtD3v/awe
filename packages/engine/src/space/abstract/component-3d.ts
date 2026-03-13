// @ts-check

import AugmentedGroup from "../../internal/events/augmented-group";
import {
  Box3,
  Euler,
  Matrix4,
  Mesh,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import type { ComponentData } from "../../@types/game";
import type { ComponentInfo, TransformConfigOpts } from "./component-info";
import type { Space } from "../space";
import type {
  ComponentManager,
  CreateComponentOpts,
} from "../components";
import {
  CollisionEnterEvent,
  CollisionExitEvent,
  SensorEvent,
  Collider,
  RigidBody,
} from "../../physics/types";
import { Component3DData, TransformData } from "./component-3d-data";
import { ComponentFactory } from "./component-factory";
import { type DataSchemaConfig } from "../datamodel/data-wrapper";
import emitter from "../../internal/engine-emitter";
import { EngineEvents } from "../../internal/engine-events";
import { IS_EDIT_MODE } from "../../internal/constants";
import { ComponentTypeMap, CType } from "../components/components";
import { LOAD_TIMEOUT, withTimeout } from "../../internal/utils/js";
import { FrustumChecker } from "../../internal/utils/frustum-checker";
import { XYZ } from "../components/types";

//
const ACTIVE_COLLISION_EVENTS = {
  COLLISION_ENTER: "COLLISION_ENTER",
  COLLISION_STAY: "COLLISION_STAY",
  COLLISION_EXIT: "COLLISION_EXIT",
  //
  SENSOR_ENTER: "SENSOR_ENTER",
  SENSOR_STAY: "SENSOR_STAY",
  SENSOR_EXIT: "SENSOR_EXIT",
} as const;

const EVENTS = {
  CHILD_ADDED: "CHILD_ADDED",
  CHILD_REMOVED: "CHILD_REMOVED",
  CHILDREN_LOADED: "CHILDREN_LOADED",
  MATRIX_CHANGED: "MATRIX_CHANGED",
  READY: "READY",
  ATTACHED: "ATTACHED",
  DISPOSED: "DISPOSED",
  VIEW_ENTER: "VIEW_ENTER",
  VIEW_EXIT: "VIEW_EXIT",
  ...ACTIVE_COLLISION_EVENTS,
} as const;

interface EventListeners {
  [EVENTS.MATRIX_CHANGED]: (component: Component3D) => void;
  [EVENTS.DISPOSED]: () => void;
  [EVENTS.READY]: () => void;
  [EVENTS.COLLISION_ENTER]: (collision: CollisionEnterEvent) => void;
  [EVENTS.COLLISION_STAY]: (collision: CollisionEnterEvent) => void;
  [EVENTS.COLLISION_EXIT]: (collision: CollisionExitEvent) => void;
  //
  [EVENTS.SENSOR_ENTER]: (event: SensorEvent) => void;
  [EVENTS.SENSOR_STAY]: (event: SensorEvent) => void;
  [EVENTS.SENSOR_EXIT]: (event: SensorEvent) => void;
  //
  [EVENTS.VIEW_ENTER]: () => void;
  [EVENTS.VIEW_EXIT]: () => void;
}

export interface ComponentOpts {
  space: Space;
  container: ComponentManager;
  info: ComponentInfo;
  data: Component3DData;
}

export interface DataChangeOpts<
  Data extends Component3DData = Component3DData
> {
  prev: Data;
  isProgress: boolean;
}

const identityMatrix = new Matrix4();

export const OPTS = Symbol("@oo/options");

const coordsFields = {
  position: true,
  rotation: true,
  scale: true,
} as const;

type ChangeHandlers<T extends {}> = {
  [K in keyof T]?: (value: T[K]) => void | Promise<void>;
};

/**
 * Base class for all 3D components in the engine.
 *
 * Components are the building blocks of a game world. They represent objects
 * like models, meshes, avatars, terrain, etc. Each component has associated
 * data, physics properties, and can emit/listen to events.
 *
 * @public
 */
export class Component3D<
  Data extends Component3DData = Component3DData
> extends AugmentedGroup {
  /**
   * @internal
   */
  EVENTS = EVENTS;

  /**
   * @internal
   */
  isComponent = true;

  /**
   * Collider for this component, it encapsulates some convenience methods for physics
   * And gives access to the underlying physics rigidbody and collider
   */
  collider: Collider = null;

  /**
   * Rigid body attached to this component, it encapsulates some convenience methods for physics
   * And gives access to the underlying physics rigidbody and colliders
   *
   * you can find more info at {@link RigidBody}
   */
  rigidBody: RigidBody = null;

  /**
   * geometry prop is not allowed on components
   */
  geometry: never;

  /**
   * material prop is not allowed on components
   */
  material: never;

  /**
   * @internal
   */
  [OPTS] = {
    persistent: false,
    createdOnInit: false,
  };

  /**
   * Reference to the Space (game world) this component belongs to
   */
  public space: Space;

  /**
   * @internal
   */
  public container: ComponentManager;

  /**
   * @internal
   */
  public info: ComponentInfo;

  /**
   * Whether this component has been disposed and is no longer valid.
   */
  public wasDisposed: boolean;

  /**
   * @internal
   */
  get _componentFactory(): ComponentFactory<Component3D> {
    //
    const registry = this.space.registry;

    return registry.componentTypes[this.opts.data.type as CType];
  }

  private _data: Data;

  private _currentData: Data;

  private _dataListeners: Array<() => void> = [];

  private _listenersPaused = false;

  private _dataConfig: DataSchemaConfig;

  /**
   * @internal
   */
  protected _changeCallbacks: ChangeHandlers<this["data"]> = {};

  private _changeCallbackKeys: string[] = null;

  /**
   * @internal
   */
  _isLoading = true;

  /**
   * @internal
   */
  constructor(protected opts: ComponentOpts) {
    //
    super();

    if (opts) {
      //

      this.space = opts.space;

      this.container = opts.container;

      this.$emitter._aOpts.data = opts.data;

      this._initData(opts.data);

      this.info = opts.info;

      this.name = this.data.name || this.data.id;
    }
  }

  private _initData(data: ComponentData) {
    //
    this._dataConfig = this._componentFactory.dataConfig;

    this._data = data as Data;

    this._currentData = { ...this._data };

    this._dataListeners.push(this._dataChangeListener);
  }

  private _frustumChecker: FrustumChecker;

  /**
   * Activates frustum check for this component; this will emit onViewEnter and onViewExit events
   * on the component when it enters or exits the camera frustum.
   *
   * @param mesh - The mesh to use for frustum check (optional, defaults to the component's collision mesh)
   */
  enableFrustumCheck(mesh?: Mesh) {
    //
    if (this._frustumChecker) {
      this.disableFrustumCheck();
    }
    this._frustumChecker = new FrustumChecker({
      component: this,
      mesh: mesh ?? this.getCollisionMesh(),
    });
  }

  /**
   * Disables frustum check for this component
   */
  disableFrustumCheck() {
    //
    this._frustumChecker?.dispose();
    this._frustumChecker = null;
  }

  /**
   * Event fired when this component enters the camera frustum
   * You need to call enableFrustumCheck to activate this event
   */
  onViewEnter(cb: () => void) {
    //
    return this.on(EVENTS.VIEW_ENTER, cb);
  }

  /**
   * Event fired when this component exits the camera frustum
   * You need to call enableFrustumCheck to activate this event
   */
  onViewExit(cb: () => void) {
    //
    return this.on(EVENTS.VIEW_EXIT, cb);
  }

  /**
   * Returns true if this component is currently in the camera frustum
   * You need to call enableFrustumCheck to activate this feature
   */
  get isInView() {
    //
    return this._frustumChecker?._inFrustrum;
  }

  /**
   * The component's data object containing all configurable properties.
   * Changes to data trigger the component's update lifecycle.
   */
  get data() {
    //
    return this._data;
  }

  /** @internal */
  _applyData(data: any) {
    this._data = data;
    this._notifyDataListeners();
  }

  /**
   * @internal
   */
  async onInit() {
    //

    if (this.info.transform) {
      this._updateTransform(null);
      this.updateMatrixWorld(true);
    }

    if (!IS_EDIT_MODE) {
      await withTimeout(this.init(), this.info.initTimeout || LOAD_TIMEOUT);
    } else {
      await this.init();
    }

    if (this.wasDisposed) return;

    this._currentData = { ...this.data };

    try {
      this.container.loaded.then(() => {
        //
        if (this.wasDisposed) return;

        this.emit(EVENTS.READY);

        this._onReady();
      });
    } catch (e) {
      debugger;
    }
  }

  /**
   * @internal
   */
  async _onReady() {}

  /**
   * @internal
   */
  _onDispose() {
    if (this.wasDisposed) return;

    this.wasDisposed = true;

    this.emit(this.EVENTS.DISPOSED);

    this.dispose();

    this._dataListeners = [];

    this.space = null;

    this.container = null;

    this.opts = null;
  }

  /**
   * Updates the component's data with the provided partial data object.
   * This triggers the component's data change lifecycle. Multiple updates
   * are batched and executed in a single frame.
   *
   * @param data - Partial data object to merge into the component's data
   * @param notify - Whether to notify listeners of the change (default: true)
   */
  setData(data: Partial<Data>, notify = true) {
    //
    const valuePathSet = this._getValuePathSet();

    for (const key of Object.keys(data)) {
      const val = (data as any)[key];

      if (
        val != null &&
        typeof val === "object" &&
        !Array.isArray(val) &&
        valuePathSet[key]
      ) {
        // Value-path merge: shallow merge into existing object
        (this._data as any)[key] = { ...(this._data as any)[key], ...val };
      } else {
        (this._data as any)[key] = val;
      }
    }

    if (notify) {
      this._notifyDataListeners();
    }
  }

  private _valuePathSet: Record<string, boolean> = null;

  private _getValuePathSet() {
    //
    if (this._valuePathSet == null) {
      this._valuePathSet = {
        position: true,
        rotation: true,
        scale: true,
        "collider.translationLock": true,
        "collider.rotationLock": true,
      };

      const extra = this._dataConfig?.valuePaths;
      if (extra) {
        for (const p of extra) {
          this._valuePathSet[p] = true;
        }
      }
    }

    return this._valuePathSet;
  }

  private _notifyDataListeners() {
    //
    if (this._listenersPaused) return;

    for (let i = 0; i < this._dataListeners.length; i++) {
      this._dataListeners[i]();
    }
  }

  /**
   * @internal
   */
  protected _assignXYZ(
    field: string,
    source: { x?: number; y?: number; z?: number }
  ) {
    //
    const target = (this._data as Record<string, unknown>)[field];

    if (source == null || target == null) return null;

    const res: { x?: number; y?: number; z?: number } = {};

    if (source.x != null && (target as { x?: number }).x != null)
      res.x = source.x;
    if (source.y != null && (target as { y?: number }).y != null)
      res.y = source.y;
    if (source.z != null && (target as { z?: number }).z != null)
      res.z = source.z;

    // Direct merge on _data for the value-path field
    (this._data as any)[field] = { ...(this._data as any)[field], ...res };

    this._notifyDataListeners();

    return res;
  }

  /**
   * @internal
   */
  getTransformData(): TransformData {
    //
    const data = this.data as Record<string, unknown>;

    const tdata: TransformData = {};

    if (data.position)
      tdata.position = {
        ...(data.position as XYZ),
      };
    if (data.rotation)
      tdata.rotation = {
        ...(data.rotation as XYZ),
      };
    if (data.scale) tdata.scale = { ...(data.scale as XYZ) };

    return tdata;
  }

  /**
   * @internal
   *
   * Update data transform from component transform
   */
  syncWithTransform(_isProgress = false) {
    this._isProgress = true;
    //
    try {
      this._listenersPaused = true;

      this._assignXYZ("position", this.position);

      this._assignXYZ("rotation", this.rotation);

      this._assignXYZ("scale", this.scale);
      //
    } finally {
      //
      this._listenersPaused = false;

      this._notifyDataListeners();
    }
  }

  /**
   * @internal
   */
  _updateTransform(
    opts: DataChangeOpts | null,
    fields: TransformConfigOpts = this.info.transform ?? coordsFields
  ) {
    //
    if (fields === false) return;

    const data = this.data as unknown as Record<string, unknown>;
    const prev = opts?.prev as unknown as Record<string, unknown> | undefined;

    if (fields === true) {
      //
      fields = coordsFields;
    }

    if (fields?.position && prev?.position !== data.position) {
      this.position.copy(data.position as Vector3);
    }

    if (fields?.rotation && prev?.rotation !== data.rotation) {
      const r = data.rotation as { x: number; y: number; z: number };
      this.rotation.set(r.x, r.y, r.z);
    }

    if (fields?.scale && prev?.scale !== data.scale) {
      this.scale.copy(data.scale as Vector3);
    }
  }

  protected async init() {}

  /**
   * @internal
   */
  onDataChange(opts: DataChangeOpts<Data>) {}

  private _dataChangeScheduled = false;

  /**
   * @internal
   */
  _isProgress = false;

  _dataChangeListener = () => {
    // currently needed for script host to sync with scripts instance data asap
    // in order for component gui to update
    if (this._dataChangeScheduled) return;

    this._dataChangeScheduled = true;

    emitter.once(EngineEvents.UPDATE, this._onDataChange);

    // setTimeout(this._onDataChange);
  };

  private _onDataChange = () => {
    try {
      //
      if (this.wasDisposed) return;

      this._dataChangeScheduled = false;

      const opts: DataChangeOpts<Data> = {
        isProgress: this._isProgress,
        prev: this._currentData,
      };

      if (opts.prev.script !== this.data.script) {
        //
        this.container._updateComponentScriptId(
          this,
          this.data.script?.identifier,
          opts.prev.script?.identifier
        );

        this.container._updateComponentTag(
          this,
          this.data.script?.tag,
          opts.prev.script?.tag
        );
      }

      this._updateTransform(opts);

      if (this._changeCallbackKeys == null) {
        //
        this._changeCallbackKeys = Object.keys(this._changeCallbacks);
      }

      for (let i = 0; i < this._changeCallbackKeys.length; i++) {
        //
        const key = this._changeCallbackKeys[i];

        const handler = this._changeCallbacks[key];

        if (handler && this.data[key] !== this._currentData[key]) {
          //
          handler.call(this, this.data[key], opts);
        }
      }

      this.onDataChange(opts);

      this.emit("data", { data: this.data, prev: this._currentData });

      this._currentData = { ...this.data };
    } finally {
      this._isProgress = false;
    }
  };

  /**
   * @internal
   */
  add(object: Object3D) {
    //

    super.add(object);

    if (object instanceof Component3D) {
      this.emit(EVENTS.CHILD_ADDED, object);
      if (this._isLoading == false && object.isPersistent) {
        this._emitChildrenLoaded();
      }

      object.emit(EVENTS.ATTACHED);
    }

    return this;
  }

  /**
   * @internal
   */
  _emitChildrenLoaded() {
    //
    this.emit(
      EVENTS.CHILDREN_LOADED,
      this.childComponents.filter((c) => c.isPersistent)
    );
  }

  /**
   * @internal
   */
  remove(object: Object3D) {
    //
    super.remove(object);

    if (object instanceof Component3D) {
      this.emit(EVENTS.CHILD_REMOVED, object);
      if (this._isLoading == false && object.isPersistent) {
        this._emitChildrenLoaded();
      }
    }

    return this;
  }

  protected dispose() {}

  private _prevMatrix = new Matrix4();

  private _needsDecompose = true;
  private _worldPos = new Vector3();
  private _worldQuat = new Quaternion();
  private _worldSc = new Vector3(1, 1, 1);
  private _worldRot = new Euler();

  private _needsInv = true;
  private _matWorldInv = new Matrix4();
  private _worldQuatInv = new Quaternion();

  /**
   * @internal
   */
  updateMatrixWorld(force?: boolean) {
    //
    super.updateMatrixWorld(force);

    if (!this.matrixWorld.equals(this._prevMatrix)) {
      //
      this._prevMatrix.copy(this.matrixWorld);

      this._needsDecompose = true;

      this._needsInv = true;

      this.emit(EVENTS.MATRIX_CHANGED, this);
    }
  }

  private _isParentIdentity() {
    //
    return (
      this.parent === this.container ||
      this.parent?.matrixWorld.equals(identityMatrix)
    );
  }

  private _decomposeWorldMatrix() {
    //
    if (this._isParentIdentity()) {
      //
      this._worldPos.copy(this.position);

      this._worldQuat.copy(this.quaternion);

      this._worldSc.copy(this.scale);
    } else {
      //
      this.matrixWorld.decompose(
        this._worldPos,
        this._worldQuat,
        this._worldSc
      );
    }

    this._needsDecompose = false;
  }

  private _inverse() {
    //
    this._matWorldInv.copy(this.matrixWorld).invert();
    this._worldQuatInv.copy(this._worldQuat).invert();

    this._needsInv = false;
  }

  /**
   * the position in world space
   */
  get positionWorld() {
    if (this._needsDecompose) {
      this._decomposeWorldMatrix();
    }
    return this._worldPos;
  }

  /**
   * the quaternion in world space
   */
  get quaternionWorld() {
    if (this._needsDecompose) {
      this._decomposeWorldMatrix();
    }
    return this._worldQuat;
  }

  /**
   * the rotation in world space
   */
  get rotationWorld() {
    if (this._needsDecompose) {
      this._decomposeWorldMatrix();
    }
    this._worldRot.setFromQuaternion(this._worldQuat);
    return this._worldQuat;
  }

  /**
   * the scale in world space
   */
  get scaleWorld() {
    if (this._needsDecompose) {
      this._decomposeWorldMatrix();
    }
    return this._worldSc;
  }

  /**
   * @internal
   */
  get _matrixWorldInv() {
    if (this._needsInv) {
      this._inverse();
    }
    return this._matWorldInv;
  }

  /**
   * @internal
   */
  get _worldQuaternionInv() {
    if (this._needsInv) {
      this._inverse();
    }
    return this._worldQuatInv;
  }

  /**
   * @internal
   */
  _setWorldPosAndQuat(worldPos: Vector3, worldQuat: Quaternion) {
    //
    if (this._isParentIdentity()) {
      //
      this.position.copy(worldPos);

      this._worldPos.copy(worldPos);

      this.quaternion.copy(worldQuat);

      this._worldQuat.copy(worldQuat);
      //
    } else {
      // Hack to avoid propagating childrenDirty flag to parent
      // @ts-ignore
      this.matrixWorld.compose(worldPos, worldQuat, this.scaleWorld);

      let parentMatInv = (this.parent as Component3D)._matrixWorldInv;

      if (parentMatInv == null) return;

      this.matrix.copy(this.matrixWorld).premultiply(parentMatInv);

      this.matrix.decompose(this.position, this.quaternion, this.scale);

      // Hack to avoid propagating childrenDirty flag to parent
      // @ts-ignore
      this.matrixNeedsUpdate = false;

      this.matrixWorldNeedsUpdate = false;

      // @ts-ignore
      this.childrenNeedsUpdate = true;

      this.updateMatrixWorld(false);

      this._worldPos.copy(worldPos);

      this._worldQuat.copy(worldQuat);

      this._needsDecompose = false;
    }
  }

  /**
   * @internal
   */
  _setWorldPosition(worldPos: Vector3) {
    //
    if (this._isParentIdentity()) {
      //
      this.position.copy(worldPos);

      this._worldPos.copy(worldPos);
      //
    } else {
      //
      this._setWorldPosAndQuat(worldPos, this.quaternionWorld);
    }
  }

  /**
   * @internal
   */
  _setWorldQuaternion(worldQuat: Quaternion) {
    //
    if (this._isParentIdentity()) {
      //
      this.quaternion.copy(worldQuat);

      this._worldQuat.copy(worldQuat);
      //
    } else {
      //
      this._setWorldPosAndQuat(this.positionWorld, worldQuat);
    }
  }

  /**
   * @internal
   * Use specitic onXXX methods instead
   */
  on(event: string, listener: (...args: any[]) => unknown) {
    //
    super.on(event, listener);

    if (ACTIVE_COLLISION_EVENTS[event] && this.rigidBody) {
      this.rigidBody.__updateActiveEvents();
    }

    return () => {
      this.off(event, listener);
    };
  }

  /**
   * @internal
   */
  off(event: string, listener: (...args: any[]) => unknown) {
    //
    super.off(event, listener);

    if (ACTIVE_COLLISION_EVENTS[event] && this.rigidBody) {
      this.rigidBody.__updateActiveEvents();
    }
  }

  /**
   * @internal
   */
  onMatrixChanged(cb: EventListeners[typeof EVENTS.MATRIX_CHANGED]) {
    //
    return this.on(EVENTS.MATRIX_CHANGED, cb);
  }

  /**
   * @internal
   */
  offMatrixChanged(cb: EventListeners[typeof EVENTS.MATRIX_CHANGED]) {
    //
    this.off(EVENTS.MATRIX_CHANGED, cb);
  }

  /**
   * Event fired when this component starts colliding with another component
   */
  onCollisionEnter(cb: EventListeners[typeof EVENTS.COLLISION_ENTER]) {
    //
    return this.on(EVENTS.COLLISION_ENTER, cb);
  }

  /**
   * Event fired when this component stops colliding with another component
   */
  onCollisionExit(cb: EventListeners[typeof EVENTS.COLLISION_EXIT]) {
    //
    return this.on(EVENTS.COLLISION_EXIT, cb);
  }

  /**
   * This event is fired each frame between the start and end of a collision
   */
  onCollisionStay(cb: EventListeners[typeof EVENTS.COLLISION_STAY]) {
    //
    return this.on(EVENTS.COLLISION_STAY, cb);
  }

  /**
   * Event fired when this component starts intersecting a sensor
   */
  onSensorEnter(cb: EventListeners[typeof EVENTS.SENSOR_ENTER]) {
    return this.on(EVENTS.SENSOR_ENTER, cb);
  }

  /**
   * Event fired when this component stops intersecting a sensor
   */
  onSensorExit(cb: EventListeners[typeof EVENTS.SENSOR_EXIT]) {
    return this.on(EVENTS.SENSOR_EXIT, cb);
  }

  /**
   * This event is fired each frame between the start and end of a sensor intersection
   */
  onSensorStay(cb: EventListeners[typeof EVENTS.SENSOR_STAY]) {
    return this.on(EVENTS.SENSOR_STAY, cb);
  }

  /**
   * Returns the unique id for this component
   */
  get componentId() {
    return this.data.id;
  }

  /**
   * Returns the name of this component (if set in data.name)
   */
  get componentName() {
    return this.data.name;
  }

  /**
   * Returns the type of this component (avatar, model, etc)
   */
  get componentType() {
    return this.data.type;
  }

  /**
   * Returns the unique identifier for this component
   */
  get identifier() {
    return this.data.script?.identifier;
  }

  /**
   * Returns the group identifier for this component
   */
  get tag() {
    //
    return this.data.script?.tag;
  }

  /**
   * @internal
   */
  _sortChildren() {
    //
    this.children.sort((a, b) => {
      //
      const aIndex =
        (a as { data?: { _index?: number } }).data?._index ??
        Number.MAX_SAFE_INTEGER;
      const bIndex =
        (b as { data?: { _index?: number } }).data?._index ??
        Number.MAX_SAFE_INTEGER;

      return aIndex - bIndex;
    });

    if (!this._isLoading) {
      this._emitChildrenLoaded();
    }
  }

  /**
   * Returns direct child components sorted by their data._index property.
   * Only includes Component3D instances, not raw Three.js objects.
   */
  get childComponents(): Component3D[] {
    // return child components sorted by their data._index property
    return this.children
      .filter((c) => c instanceof Component3D)
      .sort((a, b) => {
        //
        return a.data._index - b.data._index;
        //
      }) as Component3D[];
  }

  /**
   * Returns the parent component if it exists and is a Component3D.
   * Returns null if parent is not a component (e.g., the root container).
   */
  get parentComponent(): Component3D {
    //
    if (this.parent instanceof Component3D) {
      return this.parent as Component3D;
    }

    return null;
  }

  /**
   * Returns true if this component is a dierct or indirect child of the provided component
   */
  isDescendantOf(component: Component3D) {
    //
    let parent = this.parent;

    while (parent != null) {
      //
      if (parent === component) return true;

      parent = parent.parent;
    }

    return false;
  }

  protected _onCreateCollisionMesh() {
    //
    return null;
  }

  #collisionMesh: Mesh = null;

  /**
   * @internal
   */
  getCollisionMesh(): Mesh {
    //
    if (this.#collisionMesh == null) {
      //
      this.#collisionMesh = this._onCreateCollisionMesh();

      if (this.#collisionMesh != null) {
        //
        this.add(this.#collisionMesh);
      }
    }

    return this.#collisionMesh;
  }

  /**
   * @internal
   */
  _getCollisionInfo<T>(opts: T): T {
    return opts;
  }

  /**
   * @internal
   */
  protected _componentBBox = new Box3();

  /**
   * Returns the bounding box of this component
   *
   * @param target - The target to set the bounding box to, if not provided a new Box3 will be returned
   */
  getBBox(target = this._componentBBox) {
    //
    return this._getBBoxImp(target);
  }

  /**
   * @internal
   */
  protected _getBBoxImp(target: Box3) {
    target.setFromObject(this);

    // safegard for never 0 bbox size
    target.min.addScalar(-Number.EPSILON);
    target.max.addScalar(Number.EPSILON);

    return target;
  }

  /**
   * Returns true if this component is persistent (saved to the scene data).
   * Non-persistent components are created at runtime and not saved.
   */
  get isPersistent() {
    //
    return this[OPTS].persistent;
  }

  /**
   * @internal
   */
  protected _componentDimensions = new Vector3();

  /**
   * Returns the dimensions of this component
   *
   * @param target - The target to set the dimensions to, if not provided a new Vector3 will be returned
   */
  getDimensions(target = this._componentDimensions) {
    const box = this.getBBox();

    box.getSize(target);

    return target;
  }

  /**
   * Duplicate this component
   *
   * Returns a promise that resolves with the duplicated component
   */
  duplicate(opts?: CreateComponentOpts): Promise<this> {
    return this.container.duplicate(this, opts) as any;
  }

  /**
   * @internal
   */
  get isBehavior() {
    //
    return false;
  }

  /**
   * Destroy this component
   */
  destroy() {
    if (this.container != null) {
      this.container.destroy(this);
    }
  }

  /**
   * @internal
   */
  getDataNode(opts: { template?: boolean } = {}) {
    //
    const data = structuredClone(this._data);

    if (opts.template) {
      //
      delete data.id;
      delete data.script?.identifier;
      delete data.parentId;
    }

    const children = {};

    this.childComponents.forEach((c) => {
      //
      if (!c.isPersistent) return;

      children[c.data.id] = c.getDataNode(opts);
    });

    return {
      ...data,
      children,
    } as ComponentData & { children: Record<string, ComponentData> };
  }

  /**
   * @internal
   */
  _canBatchDraw() {
    //
    const disallowed = ["group", "text", "godray", "iframe"];
    return (
      !disallowed.includes(this.info.type) &&
      this.info.batchDraw !== false &&
      !this.info.singleton &&
      this.getCollisionMesh() != null
    );
  }
}
