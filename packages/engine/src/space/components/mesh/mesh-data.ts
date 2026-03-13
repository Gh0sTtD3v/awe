import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";
import { PluginData } from "../types";
import { RenderMode } from "../../../@types/types";

/**
 * @public
 *
 * Configuration data for {@link MeshComponent}. Defines the configuration for creating
 * primitive shape meshes (box, sphere, cylinder, plane, dome) in the scene.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface MeshComponentData extends Component3DData {
  /**
   * @internal
   */
  kit?: "cyber";

  /**
   * The component type identifier. Must be `"mesh"`.
   */
  type: "mesh";

  /**
   * Unique identifier for this component. If not provided, an auto id will be generated.
   */
  id?: string;

  /**
   * Display name for the component. Defaults to `""`.
   */
  name?: string;

  /**
   * Geometry configuration for the mesh shape and dimensions.
   * Defaults to a box with size 1x1x1.
   */
  geometry?: MeshGeometryData;

  /**
   * Position of the component in the space. Defaults to `{x: 0, y: 0, z: 0}`.
   */
  position?: XYZ;

  /**
   * Rotation of the component in the space, in degrees. Defaults to `{x: 0, y: 0, z: 0}`.
   */
  rotation?: XYZ;

  /**
   * Scale of the component in the space. Defaults to `{x: 1, y: 1, z: 1}`.
   */
  scale?: XYZ;

  /**
   * Color of the mesh as a CSS color string (e.g. `"#ff0000"`, `"red"`). Defaults to `"#ffffff"`.
   */
  color?: string;

  /**
   * Image source for a simple texture applied to the mesh surface.
   * Can be a URL string or an object with a `url` property. Defaults to `""` (no image).
   */
  image?: Image;

  /**
   * Opacity of the mesh, from 0 (fully transparent) to 1 (fully opaque).
   * When set below 1, transparency is automatically enabled. Defaults to `1`.
   */
  opacity?: number;

  /**
   * Whether the mesh should be displayed in live/play mode. Defaults to `true`.
   * It'll still be visible in the editor (useful for invisible colliders, eg define bounds for a space).
   */
  display?: boolean;

  /**
   * Whether the mesh should be displayed in editor mode. Defaults to `true`.
   */
  displayInEditor?: boolean;

  /**
   * Visual rendering style for the mesh. Uses the shared engine render modes.
   *
   * - `"default"` — Standard rendering with full materials and lighting.
   * - `"toon"` — Cel-shaded/cartoon style rendering.
   * - `"glitch"` — Distorted glitch effect.
   * - `"ghost"` — Semi-transparent ghostly appearance.
   * - `"error"` — Error state visual indicator.
   *
   * Defaults to `"default"`.
   */
  renderMode?: RenderMode;

  /**
   * Whether to render the mesh as a wireframe overlay.
   * Defaults to `false`.
   */
  wireframe?: boolean;

  /**
   * Visual plugins to apply to the mesh (e.g. glow, damage effects).
   * Same plugin system used by model and avatar components.
   */
  plugins?: PluginData[];

  /**
   * Whether the mesh casts shadows onto other objects.
   * Defaults to `true`.
   */
  castShadow?: boolean;

  /**
   * Whether the mesh receives shadows from other objects.
   * Defaults to `true`.
   */
  receiveShadow?: boolean;
}

/**
 * @public
 *
 * Geometry data for the {@link MeshComponentData.geometry} property.
 * Defines the primitive shape type and its dimensional parameters.
 *
 * The {@link MeshGeometryData.type | type} field determines which params object is used:
 * - `"box"` uses {@link MeshGeometryData.boxParams | boxParams}
 * - `"plane"` uses {@link MeshGeometryData.boxParams | boxParams} (width and height only)
 * - `"sphere"` uses {@link MeshGeometryData.sphereParams | sphereParams}
 * - `"dome"` uses {@link MeshGeometryData.sphereParams | sphereParams} (renders as a half-sphere)
 * - `"cylinder"` uses {@link MeshGeometryData.cylinderParams | cylinderParams}
 */
export interface MeshGeometryData {
  /**
   * The type of primitive geometry to create. Determines which params
   * object is used for shape dimensions.
   */
  type: "plane" | "box" | "sphere" | "cylinder" | "dome";

  /**
   * Parameters for box geometry. Also used for plane geometry
   * (only `width` and `height` apply to planes). Defaults to
   * `{ width: 1, height: 1, depth: 1 }`.
   */
  boxParams: BoxParamsData;

  /**
   * Parameters for sphere geometry. Also used for dome geometry
   * (renders as a half-sphere). Defaults to
   * `{ radius: 1, widthSegments: 32, heightSegments: 32 }`.
   */
  sphereParams: SphereParamsData;

  /**
   * Parameters for cylinder geometry. Defaults to
   * `{ radiusTop: 1, radiusBottom: 1, height: 1, radialSegments: 32, heightSegments: 1, openEnded: false }`.
   */
  cylinderParams: CylinderParamsData;
}

/**
 * @public
 *
 * Dimensional parameters for box geometry.
 * Also used for plane geometry (only {@link BoxParamsData.width | width} and
 * {@link BoxParamsData.height | height} apply).
 *
 * See {@link https://threejs.org/docs/#api/en/geometries/BoxGeometry | BoxGeometry}
 */
export interface BoxParamsData {
  /** Width of the box along the X axis. Defaults to `1`. */
  width: number;
  /** Height of the box along the Y axis. Defaults to `1`. */
  height: number;
  /** Depth of the box along the Z axis. Not used for plane geometry. Defaults to `1`. */
  depth: number;
}

/**
 * @public
 *
 * Dimensional parameters for sphere and dome geometry.
 * When used with `"dome"` geometry type, creates a half-sphere.
 *
 * See {@link https://threejs.org/docs/#api/en/geometries/SphereGeometry | SphereGeometry}
 */
export interface SphereParamsData {
  /** Radius of the sphere. Defaults to `1`. */
  radius: number;
  /** Number of horizontal segments. Higher values produce smoother geometry. Defaults to `32`. */
  widthSegments: number;
  /** Number of vertical segments. Higher values produce smoother geometry. Defaults to `32`. */
  heightSegments: number;
}

/**
 * @public
 *
 * Dimensional parameters for cylinder geometry.
 *
 * See {@link https://threejs.org/docs/#api/en/geometries/CylinderGeometry | CylinderGeometry}
 */
export interface CylinderParamsData {
  /** Radius of the top face of the cylinder. Defaults to `1`. */
  radiusTop: number;
  /** Radius of the bottom face of the cylinder. Defaults to `1`. */
  radiusBottom: number;
  /** Height of the cylinder along the Y axis. Defaults to `1`. */
  height: number;
  /** Number of segmented faces around the circumference. Higher values produce smoother geometry. Defaults to `32`. */
  radialSegments: number;
  /** Number of rows of faces along the height. Defaults to `1`. */
  heightSegments: number;
  /** Whether the ends of the cylinder are open or capped. Defaults to `false` (capped). */
  openEnded: boolean;
}

/**
 * @public
 *
 * An image reference used for textures. Either a direct URL string or an
 * object containing a `url` property.
 */
export type Image = string | { url: string };

/**
 * @public
 *
 * Extracts the URL string from an {@link Image} value.
 *
 * @param img - The image reference to extract the URL from.
 * @returns The URL string, or `undefined` if `img` is nullish.
 */
export function imageUrl(img: Image): string {
  return typeof img === "string" ? img : img?.url;
}
