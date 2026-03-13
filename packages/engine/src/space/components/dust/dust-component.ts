// @ts-check

import DustFactory from "../../../internal/dust";

import { Component3D } from "../../abstract/component-3d";

import { disposeThreeResources } from "../../../internal/utils/dispose";
import { DustComponentData } from "./dust-data";
export type { DustComponentData } from "./dust-data";

/**
 * @public
 *
 * A component that creates a particle dust trail effect following a moving target in the
 * 3D scene. When the target Object3D moves beyond a minimum distance threshold, dust
 * particles spawn at the target's position (with optional offset and randomness) and
 * gradually fade away. This is useful for adding ground dust effects behind
 * walking/running characters, vehicles, or any moving object.
 *
 * The component type for creation is `"dust"`.
 *
 * NOTE: Since this component's data is not serializeable (target is a Object3D)
 * It's not possible to add this component to a json static scene description
 * The component must be created at runtime.
 *
 * See {@link DustComponentData} for the data schema used to configure a dust component.
 *
 * @example
 * ```ts
 * // Create a dust trail that follows an object in the scene
 * const player = space.components.byId("my-player");
 * const dust = await space.components.create({
 *   type: "dust",
 *   target: player,
 *   spawnDistance: 2,
 *   decaySpeed: 1.5,
 *   scale: 1,
 * });
 * ```
 *
 * @example
 * ```ts
 * // Create a dense, lingering dust trail with wider spread and ground-level offset
 * const dust = await space.components.create({
 *   type: "dust",
 *   target: player,
 *   spawnDistance: 1,
 *   decaySpeed: 0.5,
 *   randomXZ: 1.5,
 *   scale: 2,
 *   spawnSource: { x: 0, y: -0.5, z: 0 },
 * });
 * ```
 */
export class DustComponent extends Component3D<DustComponentData> {
  #dust = null;

  /**
   * @internal
   */
  async init() {
    this.#dust = await DustFactory.get(this.data);

    if (DustFactory.mesh.parent == null) {
      this.container.add(DustFactory.mesh as any);
    }

    // this.add(DustFactory.mesh as any)
  }

  /**
   * @internal
   */
  dispose() {
    this.#dust.dispose();
    // disposeThreeResources(this.#dust);
  }
}
