/**
 * InputValue - polling-based input for continuous values.
 *
 * Used for non-button action types: "value", "vector2", "delta", "vector2_delta".
 * For discrete button inputs with event callbacks, use InputAction instead.
 *
 * Features:
 * - Value polling: readValue()
 * - Lock/unlock: Force a fixed value (useful for auto-runners, cutscenes)
 * - Processors: Transform values (deadzone, scale, etc.)
 *
 * @module input-value
 */

import type { ValueBinding, ValueBindingConfig, Vector2 } from "./bindings";
import { createBindingFromConfig } from "./bindings";
import type {
  Processor,
  ScalarProcessorConfig,
  Vector2ProcessorConfig,
} from "./processors";
import { createProcessor, createVector2Processor } from "./processors";
import type { ControlStateManager } from "./control-state";
import type { ValueType } from "./types";

/** Processor config type based on value type */
export type ProcessorConfigFor<T> = T extends Vector2
  ? Vector2ProcessorConfig
  : ScalarProcessorConfig;

/**
 * InputValue configuration
 */
export interface InputValueConfig<T> {
  /** Unique name for this value (used for lookup) */
  name: string;
  /** Binding configs for this value */
  bindings: ValueBindingConfig<T>[];
  /** Value type: "number" or "vector2" */
  type: ValueType;
  /** Processor configs to transform the value (e.g., deadzone, scale) */
  processors?: ProcessorConfigFor<T>[];
}

/**
 * InputValue - represents a continuous input value (axis, delta, etc.)
 * @example
 * ```ts
 * const moveValue = new InputValue<Vector2>({
 *   name: "Move",
 *   type: "vector2",
 *   bindings: [Bindings.wasd(), Bindings.leftStick()],
 *   aggregator: "first", // default
 * });
 *
 * // In update loop
 * const dir = moveValue.readValue(); // { x, y }
 *
 * // Lock to fixed value (useful for auto-runners)
 * moveValue.lock({ x: 1, y: 0 });
 * moveValue.unlock();
 * ```
 */
export class InputValue<T> {
  readonly name: string;

  private _bindings: ValueBinding<T>[];
  private _processors: Processor<T>[];

  // State
  private _enabled = true;
  private _cachedValue: T;
  private _defaultValue: T;

  // Locked state
  private _locked = false;
  private _lockedValue: T | null = null;

  constructor(config: InputValueConfig<T>, defaultValue: T) {
    this.name = config.name;
    this._defaultValue = defaultValue;
    this._cachedValue = this._defaultValue;

    // Create bindings from configs
    this._bindings = config.bindings.map(
      (c) => createBindingFromConfig(c) as ValueBinding<T>
    );

    // Create processors from configs
    if (config.processors && config.processors.length > 0) {
      const factory =
        config.type === "vector2" ? createVector2Processor : createProcessor;
      this._processors = config.processors.map(
        (c) => factory(c as any) as Processor<T>
      );
    } else {
      this._processors = [];
    }
  }

  /**
   * Whether the value is enabled
   */
  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(val: boolean) {
    if (this._enabled === val) return;
    this._enabled = val;
    if (!val) {
      this._cachedValue = this._defaultValue;
    }
  }

  /**
   * Read the current value
   */
  readValue(): T {
    if (this._locked && this._lockedValue !== null) {
      return this._lockedValue;
    }
    return this._cachedValue;
  }

  /**
   * Lock the value to a specific value (useful for auto-runners)
   */
  lock(value: T): void {
    this._locked = true;
    this._lockedValue = value;
  }

  /**
   * Unlock the value
   */
  unlock(): void {
    this._locked = false;
    this._lockedValue = null;
  }

  /**
   * Check if the value is locked
   */
  get isLocked(): boolean {
    return this._locked;
  }

  /**
   * Add a binding to this value
   */
  addBinding(binding: ValueBinding<T>): void {
    this._bindings.push(binding);
  }

  /**
   * Remove a binding from this value
   */
  removeBinding(binding: ValueBinding<T>): void {
    const index = this._bindings.indexOf(binding);
    if (index !== -1) {
      this._bindings.splice(index, 1);
    }
  }

  /**
   * Add a processor to this value
   */
  addProcessor(processor: Processor<T>): void {
    this._processors.push(processor);
  }

  /**
   * Sample the bindings from control state.
   * Called once per render frame when INPUT_STATE_READY is emitted.
   */
  sample(state: ControlStateManager): void {
    if (!this._enabled) return;

    // Sample all bindings
    for (const binding of this._bindings) {
      binding.sample(state);
    }
  }

  /**
   * Update the value - read from bindings and consume.
   * Must be called after sample() and before the next sample().
   */
  update(): void {
    if (!this._enabled) return;

    // Handle locked state
    if (this._locked) {
      return;
    }

    this._cachedValue = this._aggregateBindings();

    // Apply processors
    for (const processor of this._processors) {
      this._cachedValue = processor(this._cachedValue);
    }

    // Consume all bindings
    for (const binding of this._bindings) {
      binding.consume();
    }
  }

  private _aggregateBindings(): T {
    if (this._bindings.length === 0) {
      return this._defaultValue;
    }
    /**
     * We assume that the bindings agree on the combination logic.
     * So we choose the semantics of the first binding.
     */
    return this._bindings[0].combine(this._bindings);
  }
}
