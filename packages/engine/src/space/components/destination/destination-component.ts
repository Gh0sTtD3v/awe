// @ts-check

import DestinationFactory from "../../../internal/destination";

import { Component3D, DataChangeOpts } from "../../abstract/component-3d";
import { DestinationComponentData } from "./destination-data";
import { AnimationAction, AnimationMixer, Mesh } from "three";

export type {
  DestinationComponentData,
  DestinationPaths,
  DestinationParams,
} from "./destination-data";

/**
 * A portal entry within a destination. Contains the portal's preview mesh,
 * optional door mesh, and animations for open/close transitions.
 */
export interface DestinationPortal {
  /** The portal preview mesh displayed in the scene. */
  mesh: Mesh;

  /** The portal door mesh, if present in the destination model. */
  door: Mesh | undefined;

  /** Open and close animation actions for the portal. */
  animations: {
    /** Animation actions to play when the portal opens. */
    open: AnimationAction[];

    /** Animation actions to play when the portal closes. */
    close: AnimationAction[];
  };
}

/**
 * Component that loads and manages a pre-built 3D environment (destination) as the
 * base world for the game. A destination provides a complete scene including collision
 * geometry, portals for navigation between spaces, placeholder positions for artwork,
 * and portal animations.
 *
 * This is a **singleton** component — only one destination can exist per space.
 *
 * @example
 * ```ts
 * const destination = space.components.byType("destination")[0];
 *
 * // Access portal meshes and animations
 * const portals = destination.portals;
 *
 * // Access placeholder meshes for artwork positioning
 * const placeholders = destination.placeholders;
 *
 * // Get the scale factor for placed artwork
 * const scale = destination.artworkScale;
 * ```
 */
export class DestinationComponent extends Component3D<DestinationComponentData> {
  //
  private _destination = null;

  /** @internal */
  async init() {
    // Skip loading if paths are empty or not defined
    if (!this.data.paths || (!this.data.paths.high && !this.data.paths.mid && !this.data.paths.low)) return;

    this._destination = await DestinationFactory.get(this.data);

    this.add(this._destination);
  }

  /**
   * Record of portal objects keyed by portal ID. Each portal contains
   * a mesh and associated animations for open/close transitions.
   */
  get portals(): Record<string, DestinationPortal> {
    return this._destination?.portals ?? {};
  }

  /**
   * Record of placeholder meshes keyed by placeholder ID. Placeholders
   * mark positions within the destination where artwork can be placed.
   */
  get placeholders(): Record<string, Mesh> {
    return (this._destination?.placeholders as Record<string, Mesh>) ?? {};
  }

  /**
   * Three.js AnimationMixer used to play portal open/close animations.
   */
  get portalsMixer(): AnimationMixer {
    return this._destination?.portalsMixer ?? null;
  }

  /**
   * Scale factor applied to artwork placed on destination placeholders.
   */
  get artworkScale(): number {
    return this._destination?.artworkScale ?? 1;
  }

  /** @internal */
  getCollisionMesh() {
    const collisions = this._destination?.buildCollisionMesh();

    return collisions;
  }

  /** @internal */
  async onDataChange(opts: DataChangeOpts): Promise<void> {
    // Only reload if paths have been set and this is not a progress update
    if (!opts.isProgress && this.data.paths?.high) {
      // If destination already exists, destroy it first
      if (this._destination) {
        this._destination.destroy();
        this.remove(this._destination);
        this._destination = null;
      }
      await this.init();
    }
  }

  /** @internal */
  dispose() {
    super.dispose();

    this._destination?.destroy();
  }
}
