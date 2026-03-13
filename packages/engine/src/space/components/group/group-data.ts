import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link GroupComponent}.
 *
 * Configures a group container that organizes multiple child components under
 * a single parent node in the scene graph. Transforms (position, rotation,
 * scale) applied to the group propagate to all child components, allowing them
 * to be moved, rotated, and scaled together as a unit.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface GroupComponentData extends Component3DData {
  /**
   * @internal
   */
  kit?: "cyber";

  /** Component type identifier. Must be `"group"`. */
  type: "group";

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
   * Rotation of the component in the space, in radians. Defaults to `{x: 0, y: 0, z: 0}`.
   */
  rotation?: XYZ;

  /**
   * Scale of the component in the space. Defaults to {x: 1, y: 1, z: 1}
   */
  scale?: XYZ;
}
