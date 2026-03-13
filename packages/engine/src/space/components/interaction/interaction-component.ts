// @ts-check

import { Vector3 } from "three";

import { Component3D } from "../../abstract/component-3d";

import { InteractionFactory } from "../../../internal/interaction";

import { InteractionComponentData } from "./interaction-component-data";

import { atlasInputs } from "./constants";
import type { XYZ } from "../types";
export type { InteractionComponentData } from "./interaction-component-data";

const INTERACTION_EVENTS = {
  INTERACT: "INTERACT",
  INTERACT_ENTER: "INTERACT_ENTER",
  INTERACT_EXIT: "INTERACT_EXIT",
} as const;

/**
 * @public
 *
 * A component that displays an interactive UI prompt (icon/key hint) in 3D space,
 * triggered by proximity to a reference point. When the distance target moves within
 * the configured {@link InteractionComponentData.distance | distance}, the prompt
 * becomes visible. Pressing the configured {@link InteractionComponentData.key | key}
 * fires interaction events.
 *
 * This component is intended to be used via the engine API, not placed in the studio editor.
 *
 * The component emits the following events:
 * - **INTERACT** — Fired when the trigger key is pressed while within range.
 *   Listen with {@link InteractionComponent.onInteraction}.
 * - **INTERACT_ENTER** — Fired when entering the interaction range.
 *   Listen with {@link InteractionComponent.onInteractEnter}.
 * - **INTERACT_EXIT** — Fired when exiting the interaction range.
 *   Listen with {@link InteractionComponent.onInteractExit}.
 *
 * See {@link InteractionComponentData} for the data schema used to create an interaction component.
 *
 * @example
 * // Basic interaction prompt that triggers on pressing "E"
 * const interaction = await space.components.create({
 *     type: "interaction",
 *     position: { x: 5, y: 1, z: 0 },
 *     distance: 8,
 *     atlas: "keyboard_e",
 *     key: "KeyE",
 *     billboard: true
 * });
 *
 * // Listen for interaction triggers
 * const unsub = interaction.onInteraction(() => {
 *     console.log("Interaction triggered!");
 * });
 *
 * // Clean up the listener later
 * unsub();
 *
 * @example
 * // Interaction with multiple trigger keys and custom color
 * const interaction = await space.components.create({
 *     type: "interaction",
 *     position: { x: 0, y: 2, z: -3 },
 *     distance: 5,
 *     atlas: "keyboard_space",
 *     key: ["Space", "KeyE"],
 *     billboard: true,
 *     color: 0x00ff00
 * });
 *
 * // React to entering/exiting interaction range
 * interaction.onInteractEnter(() => {
 *     console.log("Entered interaction range");
 * });
 * interaction.onInteractExit(() => {
 *     console.log("Exited interaction range");
 * });
 *
 * @example
 * // Temporarily disable and re-enable the interaction
 * interaction.active = false;  // prompt hidden and unresponsive
 * interaction.active = true;   // prompt re-enabled
 */
export class InteractionComponent extends Component3D<InteractionComponentData> {
  /** @internal */
  private _factory: InteractionFactory = null;

  /** @internal */
  _interaction = null;

  private _isInteractionComponent = false;

  /**
   * List of available atlas icon keys that can be used for the
   * {@link InteractionComponentData.atlas} property. Useful for programmatically
   * enumerating available icons.
   */
  atlasInputs = atlasInputs;

  /** @internal */
  constructor(opts) {
    super(opts);

    this._factory = opts.interactionFactory;
  }

  /** @internal */
  async init() {
    this._interaction = await this._factory.get(this.opts.space, this.data);

    this._interaction.callback = () => {
      this.emit(INTERACTION_EVENTS.INTERACT);
    };

    this._interaction.enterCallback = () => {
      this.emit(INTERACTION_EVENTS.INTERACT_ENTER);
    };

    this._interaction.exitCallback = () => {
      this.emit(INTERACTION_EVENTS.INTERACT_EXIT);
    };

    this._interaction.attachTo(this);

    this._isInteractionComponent = true;

    this.update3D();
  }

  /** @internal */
  update3D() {
    const { position, scale, rotation, ...opts } = this.data;

    this.position.copy(position as Vector3);

    this.scale.copy(scale as Vector3);

    if (this.data.billboard == false) {
      this.rotation.set(rotation.x, rotation.y, rotation.z);
    }
  }

  /** @internal */
  collision = null;

  /** @internal */
  getCollisionMesh() {
    if (this.collision == null && this._factory?.buildCollisionMesh) {
      this.collision = this._factory?.buildCollisionMesh();

      this.collision.visible = false;

      this.add(this.collision);
    }

    return this.collision;
  }

  /** @internal */
  dispose() {
    this._interaction.dispose();
  }

  /**
   * The 3D position used as the reference point for distance-based activation.
   * The interaction prompt becomes visible when within
   * {@link InteractionComponentData.distance} units of this point.
   */
  set distanceTarget(val: XYZ) {
    this._interaction.distanceTarget = val;
  }

  get distanceTarget() {
    return this._interaction.distanceTarget;
  }

  /**
   * The opacity of the interaction prompt, from `0` (fully transparent) to `1`
   * (fully opaque). Defaults to `1`.
   */
  set opacity(val: number) {
    this._interaction.opacity = val;
  }

  get opacity() {
    return this._interaction.opacity;
  }

  /**
   * The atlas icon key for the interaction prompt. Controls which icon is displayed.
   * See {@link InteractionComponentData.atlas} for available values.
   */
  set atlas(val: (typeof atlasInputs)[number]) {
    this._interaction.atlas = val;
  }

  get atlas() {
    return this._interaction.atlas;
  }

  /**
   * The keyboard key code(s) that trigger the interaction. Uses `KeyboardEvent.code`
   * format (e.g., `"KeyE"`, `"Space"`). Can be a single string or an array of strings.
   */
  set key(val: string | string[]) {
    this._interaction.key = val;
  }

  get key() {
    return this._interaction.key;
  }

  /**
   * Whether the interaction prompt is currently active and responsive to input.
   * Set to `false` to temporarily hide and disable the interaction prompt, and `true`
   * to re-enable it.
   */
  set active(val: boolean) {
    this._interaction.active = val;
  }

  get active() {
    return this._interaction.active;
  }

  /**
   * The color of the interaction prompt icon as a numeric value
   * (e.g., `0xff0000` for red, `0xffffff` for white).
   */
  set color(val: number) {
    this._interaction.color = val;
  }

  get color() {
    return this._interaction.color;
  }

  /**
   * Registers a callback to be invoked when the interaction is triggered
   * (the configured key is pressed while within range).
   *
   * @param cb - The callback function to invoke on interaction.
   * @returns A cleanup function that removes the listener when called.
   */
  onInteraction(cb: () => void) {
    return this.on(INTERACTION_EVENTS.INTERACT, cb);
  }

  /**
   * Registers a callback to be invoked when entering the interaction range.
   *
   * @param cb - The callback function to invoke.
   * @returns A cleanup function that removes the listener when called.
   */
  onInteractEnter(cb: () => void) {
    return this.on(INTERACTION_EVENTS.INTERACT_ENTER, cb);
  }

  /**
   * Registers a callback to be invoked when exiting the interaction range.
   *
   * @param cb - The callback function to invoke.
   * @returns A cleanup function that removes the listener when called.
   */
  onInteractExit(cb: () => void) {
    return this.on(INTERACTION_EVENTS.INTERACT_EXIT, cb);
  }
}
