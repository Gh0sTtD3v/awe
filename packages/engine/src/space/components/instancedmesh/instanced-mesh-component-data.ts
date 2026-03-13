import { Component3DData } from "../../abstract/component-3d-data";
import type { ShaderPlugin, InstancedAttribute } from "../visual-plugin-types";
import { XYZ } from "../types";

import { Mesh, Sphere, Vector3, Color, Box3, Object3D } from "three";

/**
 * @public
 *
 * Spawn parameters for creating a new instance via
 * {@link InstancedMeshComponent.spawn | spawn()}. All fields are optional;
 * omitted values fall back to sensible defaults (origin position, unit scale,
 * full opacity, white color).
 *
 * This component is not serializable (baseMesh data property is not serializable). It can be created only at runtime.
 */
export interface InstancedMeshSpawnData {
  /**
   * World position of the instance. Accepts an `{x, y, z}` object or a
   * three-element array `[x, y, z]`.
   */
  position?: XYZ | [number, number, number];

  /**
   * Euler rotation of the instance in radians as `[x, y, z]`.
   */
  rotation?: [number, number, number];

  /**
   * Shorthand Y-axis rotation in radians. Use instead of `rotation` when
   * only yaw is needed.
   */
  rotationY?: number;

  /**
   * Scale of the instance. Accepts an `{x, y, z}` object or a three-element
   * array `[x, y, z]`.
   */
  scale?: XYZ | [number, number, number];

  /**
   * Uniform scale multiplier applied on top of `scale`.
   */
  scaleRatio?: number;

  /**
   * Instance opacity (0–1). Only effective when the component data has
   * `opacity: true`.
   */
  opacity?: number;

  /**
   * Per-instance color as `[r, g, b]` (0–1 per channel). Only effective
   * when the component data has `color: true`.
   */
  color?: [number, number, number];

  /**
   * Texture atlas UV region as `{x, y, z, w}`. Only effective when atlas
   * is enabled in the component data.
   */
  atlas?: { x: number; y: number; z: number; w: number };

  /**
   * When `true`, this instance participates in real-time shadow casting.
   */
  enableRealTimeShadow?: boolean;
}

/**
 * @public
 *
 * Handle for a single spawned instance inside an
 * {@link InstancedMeshComponent}. Returned by
 * {@link InstancedMeshComponent.spawn | spawn()}. Mutate its properties and
 * then call {@link InstancedMeshComponent.wrapperUpdate | wrapperUpdate()} to
 * push changes to the GPU buffer.
 */
export interface InstancedMeshInstance {
  /** Unique numeric identifier assigned at spawn time. */
  readonly id: number;

  /** Mutable world position of the instance. */
  position: Vector3;

  /** Mutable scale of the instance. */
  scale: Vector3;

  /** Y-axis rotation in radians. */
  rotationY: number;

  /** Opacity value (0–1). */
  opacity: number;

  /** Instance color. */
  color: Color;

  /** Whether the instance is visible. Hidden instances are skipped during rendering. */
  visible: boolean;

  /** Whether the instance casts dynamic shadows. */
  dynamicShadow: boolean;

  /** Sets the instance position from an `{x, y, z}` object. */
  setPosition(val: XYZ): void;

  /** Sets the instance Euler rotation from a `[x, y, z]` array (radians). */
  setRotation(val: [number, number, number]): void;

  /** Sets the Y-axis rotation (radians). */
  setRotationY(val: number): void;

  /** Sets the instance quaternion directly. */
  setQuaternion(val: { x: number; y: number; z: number; w: number }): void;

  /** Sets the instance scale. */
  setScale(x: number, y: number, z: number): void;

  /** Sets the instance color from an `[r, g, b]` array (0–1) or a CSS color string. */
  setColor(val: [number, number, number] | string): void;

  /**
   * Attaches the instance to a Three.js `Object3D` so its transform is
   * updated from the source each frame.
   */
  attachTo(source: Object3D, callback?: () => void): void;

  /** Returns an axis-aligned bounding box for this instance in world space. */
  getBBox(): Box3;

  /** Removes this instance from the instanced mesh. */
  remove(): void;
}

/**
 * @public
 *
 * Plugin descriptor that extends the instanced mesh material with custom
 * shader logic and per-instance attributes. Plugins are passed via the
 * {@link InstancedMeshComponentData.plugins} array.
 */
export interface InstancedMeshPlugin extends ShaderPlugin {
  /**
   * Per-instance attribute definitions. Each key becomes a mutable property
   * on every spawned {@link InstancedMeshInstance}.
   */
  attributes?: Record<string, InstancedAttribute>;
}

/**
 * @public
 *
 * Configuration data for {@link InstancedMeshComponent}. Defines the configuration for GPU-instanced
 * rendering of many copies of a single mesh. Instanced meshes allow thousands of identical objects
 * to be drawn in very few draw calls, providing significant performance gains over individual meshes.
 */
export interface InstancedMeshComponentData extends Component3DData {
  /**
   * Asset kit identifier. Defaults to `"cyber"`.
   */
  kit?: "cyber";

  /**
   * Component type identifier. Must be `"instancedmesh"`.
   */
  type: "instancedmesh";

  /**
   * Unique identifier for this component. If not provided, an auto-generated id will be assigned.
   */
  id?: string;

  /**
   * Display name for the component. Defaults to `""`.
   */
  name?: string;

  /**
   * The Three.js `Mesh` to use as the template for instancing. All spawned instances will share
   * this mesh's geometry and material. This is the base shape that gets replicated.
   */
  baseMesh: Mesh;

  /**
   * When `true`, enables a per-instance opacity attribute on the instanced geometry. This allows
   * each spawned instance to have its own opacity value (0–1), set via the `opacity` field
   * in the spawn data.
   */
  opacity: boolean;

  /**
   * When `true`, includes normal attributes in the instanced geometry. This enables lighting
   * and shading calculations on the instances. Set to `false` for unlit/flat rendering.
   */
  useNormal: boolean;

  /**
   * When `true`, uses the vertex color attribute from the base geometry. This preserves
   * per-vertex colors baked into the original mesh geometry.
   */
  useGeometryColor: boolean;

  /**
   * When `true`, enables a per-instance color attribute. This allows each spawned instance
   * to have its own color, set via the `color` field in the spawn data.
   */
  color: boolean;

  /**
   * Texture atlas configuration for UV mapping. When enabled, each instance can display
   * a different region of a shared texture atlas. Currently only `false` (disabled) is supported.
   */
  atlas: false;

  /**
   * When `true`, uses the reverse-painter algorithm to sort instances back-to-front relative
   * to the camera. This is required for correct rendering of transparent or semi-transparent instances.
   */
  transparencySorting: boolean;

  /**
   * Configures dynamic shadow casting for the instanced geometry.
   *
   * - `"none"` — Instances do not cast shadows.
   * - `"dynamic"` — Instances cast real-time shadows.
   */
  shadow: "none" | "dynamic";

  /**
   * A custom sorting strategy for controlling instance render order. When not provided,
   * the default sorting behavior is used. This can be used to implement specialized ordering
   * logic (e.g., sorting by distance to a point other than the camera).
   */
  sorter: unknown;

  /**
   * @internal
   */
  copyBuffer: Array<number>;

  /**
   * Array of visual plugin configurations applied to the instanced mesh material. Plugins can
   * modify material behavior, add visual effects, or inject custom shader logic into the
   * instanced rendering pipeline.
   *
   * See {@link InstancedMeshPlugin} for the plugin structure.
   */
  plugins: InstancedMeshPlugin[];

  /**
   * When `true`, enables per-instance frustum culling so that instances outside the camera's
   * view frustum are not rendered. This improves performance when many instances are off-screen.
   *
   * Defaults to `true`.
   */
  useFrustumCulling: boolean;

  /**
   * When `true`, enables instance sorting each frame (e.g., for correct transparency rendering).
   * When `false`, instances are rendered in spawn order and updates are applied via a
   * non-sorted buffer path. Disable sorting for opaque instances to save CPU time.
   *
   * Defaults to `true`.
   */
  useSorting: boolean;

  /**
   * Material shader chunk overrides. Allows replacing built-in shader code sections with
   * custom GLSL, enabling advanced material customization on the instanced mesh.
   *
   * Each key is a chunk name and the value is the GLSL code to substitute.
   * Set to `null` to use the default shader chunks.
   */
  chunks: Record<string, string> | null;
}
