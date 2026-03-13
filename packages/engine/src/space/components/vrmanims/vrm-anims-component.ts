// @ts-check

import {
  Component3D,
  DataChangeOpts,
} from "../../abstract/component-3d";
import { VRMAnimationsComponentData } from "./vrm-anim-data";
import VRMAnimation from "../../../internal/avatar/vrm/animations";

/**
 * Manages VRM avatar animation definitions for the scene. This component controls which
 * animations are available to all VRM avatars, including the six built-in animations
 * (idle, walk, jump, run, fly, sitting) and any custom animations uploaded from FBX files.
 *
 * This is a singleton component — only one instance can exist per scene. It is typically
 * configured through the studio editor, but can also be created and configured programmatically.
 *
 * On initialization, the component loads and merges animations from three sources:
 * 1. Built-in default animations (always available)
 * 2. Packed animations from the {@link VRMAnimationsComponentData.url | url} bundle
 * 3. Individual unpacked animations from each entry's {@link VRMAnimationData.url | url}
 *
 * When the {@link VRMAnimationsComponentData.anims | anims} data changes at runtime,
 * the animation list is automatically recomputed and updated globally.
 *
 * @example
 * // Create a VRM animations component with custom animations
 * const vrmAnims = await space.components.create({
 *     type: "vrm-anims",
 *     anims: {
 *         idle: {
 *             fileName: "custom-idle.fbx",
 *             name: "idle",
 *             loop: true,
 *             timeScale: 1
 *         },
 *         "custom-1": {
 *             fileName: "dance.fbx",
 *             name: "dance",
 *             loop: true,
 *             timeScale: 1,
 *             url: "https://example.com/baked-dance.json"
 *         }
 *     }
 * });
 *
 * @example
 * // Look up animation info at runtime
 * const vrmAnims = space.components.byType("vrm-anims")[0];
 * const danceAnim = vrmAnims.getAnimInfo("dance");
 *
 * @public
 */
export class VRMAnimsComponent extends Component3D<VRMAnimationsComponentData> {
  /**
   * @internal
   */
  _json: any;

  /** @internal */
  _fullAnims: any;

  /** @internal */
  protected async init() {
    //
    this.matrixAutoUpdate = false;

    this.matrixWorldAutoUpdate = false;

    this.frustumCulled = false;

    await this._computeAnimlist();
    //
  }

  private async _computeAnimlist() {
    //
    const url = this.data.url;

    const customActions = this.data.anims ?? {};

    const refreshUrls = [url];

    const actionList = Object.values(customActions);
    for (let i = 0; i < actionList.length; i++) {
      const action = actionList[i] as { url?: string };
      if (action?.url) {
        refreshUrls.push(action.url);
      }
    }

    // Studio can overwrite animation files at the same URL. Clear the in-memory
    // JSON cache before recomputing so hot-reloads fetch the updated payload.
    VRMAnimation.invalidateJSONCache(refreshUrls.filter(Boolean));

    let [defaults, packed, unpacked] = await Promise.all([
      VRMAnimation.loadDefault(),
      url ? VRMAnimation.loadPacked(url, customActions) : null,
      VRMAnimation.loadUnpacked(customActions),
    ]);

    this._json = packed?.json ?? null;

    let anims = {
      ...defaults.anims,
      ...(packed?.anims ?? {}),
      ...(unpacked.anims ?? {}),
    };

    this._fullAnims = anims;

    VRMAnimation.setAnimationJSON(anims);
  }

  /**
   * @internal
   */
  async onDataChange(
    opts: DataChangeOpts<VRMAnimationsComponentData>,
  ): Promise<void> {
    //
    if (opts.prev.anims !== this.data.anims) {
      //
      await this._computeAnimlist();
    }
  }

  /**
   * Retrieves animation information for a given animation name. The lookup is
   * case-insensitive (names are compared in uppercase). Returns the animation
   * data object containing clip and emote information, or `undefined` if no
   * animation with the given name exists.
   *
   * @param name - The name of the animation to look up (e.g., `"idle"`, `"dance"`).
   *               Case-insensitive.
   * @returns The animation info object, or `undefined` if not found.
   */
  getAnimInfo(name: string) {
    const anim = this._fullAnims[name.toUpperCase()];

    return anim;
  }

  /** @internal */
  protected dispose() {}
}
