/**
 * InputAction - event-driven input for discrete button actions.
 *
 * Used for "button" type actions where you need press/release callbacks.
 * For continuous values (movement, look), use InputValue instead.
 *
 * Features:
 * - Event callbacks: onStarted, onPerformed, onCanceled
 * - Edge detection: wasJustPressed, wasJustReleased
 * - Interaction support: press, hold, tap, multiTap
 *
 * @module input-action
 */

import type { ButtonBinding, ButtonBindingConfig, ButtonState } from "./bindings";
import { ButtonState as BS, createBindingFromConfig } from "./bindings";
import type { Processor, ScalarProcessorConfig } from "./processors";
import { createProcessor } from "./processors";
import type {
  InteractionConfig,
  Interaction,
  InteractionPhase,
  InteractionContext,
} from "./interactions";
import { createInteraction } from "./interactions";
import type { ControlStateManager } from "./control-state";

const MAX_DUPLICATE_UPDATES = 2;

/**
 * Callback context passed to action event callbacks.
 */
export interface ActionCallbackContext {
  /** The action that triggered the callback */
  action: InputAction;
  /** Current value of the action (1 if pressed, 0 if not) */
  value: number;
  /** Time since the interaction started (for hold, etc.) */
  duration: number;
  /** Interaction phase that triggered this callback */
  phase: InteractionPhase;
}

/**
 * Action callback type
 */
export type ActionCallback = (ctx: ActionCallbackContext) => void;

/**
 * InputAction configuration
 */
export interface InputActionConfig {
  /** Action name */
  name: string;
  /** Binding configs for this action (button bindings) */
  bindings: ButtonBindingConfig[];
  /** Interactions to process (optional, default: press) */
  interactions?: InteractionConfig[];
  /** Processor configs to apply to the value (optional) */
  processors?: ScalarProcessorConfig[];
}

/**
 * InputAction - represents a discrete button input with event callbacks.
 * For continuous values (axes, deltas), use InputValue instead.
 *
 * @example
 * ```ts
 * const jumpAction = new InputAction({
 *   name: "Jump",
 *   bindings: [Bindings.keyButton("Space"), Bindings.gamepadButton("A")],
 *   interactions: [{ type: "press" }]
 * });
 *
 * jumpAction.onPerformed(() => mover.startJump());
 * ```
 */
export class InputAction {
  readonly name: string;

  private _bindings: ButtonBinding[];
  private _interactions: Interaction[];
  private _processors: Processor<number>[];

  // Callbacks
  private _onStarted: ActionCallback[] = [];
  private _onPerformed: ActionCallback[] = [];
  private _onCanceled: ActionCallback[] = [];

  // State
  private _enabled = true;
  private _cachedState: ButtonState = BS.Idle;
  private _cachedPressed = false;
  private _currentDuration = 0;
  private _pendingJustPressed = false;
  private _pendingJustReleased = false;
  private _frameJustPressed = false;
  private _frameJustReleased = false;
  private _suppressNextSampleEdges = false;
  private _updatesSinceSample = 0;
  private _bufferedDelta = 0;
  private _sampleStalled = false;

  constructor(config: InputActionConfig) {
    this.name = config.name;

    // Create bindings from configs
    this._bindings = config.bindings.map(
      (c) => createBindingFromConfig(c) as ButtonBinding
    );

    // Create processors from configs
    this._processors = config.processors
      ? config.processors.map(createProcessor)
      : [];

    // Create interactions from configs
    if (config.interactions && config.interactions.length > 0) {
      this._interactions = config.interactions.map(createInteraction);
    } else {
      // Default to press interaction
      this._interactions = [createInteraction({ type: "press" })];
    }
  }

  /**
   * Whether the action is enabled
   */
  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(val: boolean) {
    if (this._enabled === val) return;
    this._enabled = val;
    if (!val) {
      this._reset();
    } else {
      this._suppressNextSampleEdges = true;
    }
  }

  /**
   * Whether the action is currently pressed
   */
  get isPressed(): boolean {
    return this._cachedPressed;
  }

  /**
   * Get the current button state (JustPressed, JustReleased, or Idle)
   */
  getState(): ButtonState {
    return this._cachedState;
  }

  /**
   * Whether the action was just pressed this frame
   */
  get wasJustPressed(): boolean {
    return this._frameJustPressed;
  }

  /**
   * Whether the action was just released this frame
   */
  get wasJustReleased(): boolean {
    return this._frameJustReleased;
  }

  /**
   * Current value of the action (1 if pressed, 0 if not)
   */
  get value(): number {
    return this.isPressed ? 1 : 0;
  }

  /**
   * Add a binding to this action
   */
  addBinding(binding: ButtonBinding): void {
    this._bindings.push(binding);
  }

  /**
   * Remove a binding from this action
   */
  removeBinding(binding: ButtonBinding): void {
    const index = this._bindings.indexOf(binding);
    if (index !== -1) {
      this._bindings.splice(index, 1);
    }
  }

  /**
   * Add a processor to this action
   */
  addProcessor(processor: Processor<number>): void {
    this._processors.push(processor);
  }

  /**
   * Subscribe to started events
   */
  onStarted(callback: ActionCallback): () => void {
    this._onStarted.push(callback);
    return () => {
      const index = this._onStarted.indexOf(callback);
      if (index !== -1) this._onStarted.splice(index, 1);
    };
  }

  /**
   * Subscribe to performed events
   */
  onPerformed(callback: ActionCallback): () => void {
    this._onPerformed.push(callback);
    return () => {
      const index = this._onPerformed.indexOf(callback);
      if (index !== -1) this._onPerformed.splice(index, 1);
    };
  }

  /**
   * Subscribe to canceled events
   */
  onCanceled(callback: ActionCallback): () => void {
    this._onCanceled.push(callback);
    return () => {
      const index = this._onCanceled.indexOf(callback);
      if (index !== -1) this._onCanceled.splice(index, 1);
    };
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

    this._updatesSinceSample = 0;
    this._bufferedDelta = 0;
    this._sampleStalled = false;

    const wasPressed = this._cachedPressed;
    this._cachedPressed = this._bindings.some((b) => b.isPressed());

    if (this._suppressNextSampleEdges) {
      this._suppressNextSampleEdges = false;
      return;
    }

    if (this._cachedPressed && !wasPressed) {
      this._pendingJustPressed = true;
    }
    if (!this._cachedPressed && wasPressed) {
      this._pendingJustReleased = true;
    }
  }

  /**
   * Update the action - process interactions and consume bindings.
   * @param dt - Delta time since last frame
   */
  update(dt: number): void {
    if (!this._enabled) return;

    const hasPendingPress = this._pendingJustPressed;
    const hasPendingRelease = this._pendingJustReleased;
    const effectiveDelta = this._getEffectiveDelta(dt);

    this._frameJustPressed = hasPendingPress;
    this._frameJustReleased = hasPendingRelease;
    this._cachedState = this._frameJustPressed
      ? BS.JustPressed
      : this._frameJustReleased
      ? BS.JustReleased
      : BS.Idle;

    if (hasPendingPress) {
      this._currentDuration = 0;
      this._processInteractions({
        phase: "waiting",
        duration: this._currentDuration,
        deltaTime: 0,
        value: 1,
        isPressed: true,
        wasJustPressed: true,
        wasJustReleased: false,
      });
    }

    if (this._cachedPressed) {
      this._currentDuration += effectiveDelta;
      this._processInteractions({
        phase: "waiting",
        duration: this._currentDuration,
        deltaTime: effectiveDelta,
        value: 1,
        isPressed: true,
        wasJustPressed: false,
        wasJustReleased: false,
      });
    } else if (!hasPendingPress) {
      this._currentDuration = 0;
    }

    if (hasPendingRelease) {
      this._processInteractions({
        phase: "waiting",
        duration: this._currentDuration,
        deltaTime: 0,
        value: 0,
        isPressed: false,
        wasJustPressed: false,
        wasJustReleased: true,
      });
      this._currentDuration = 0;
    }

    // Consume all bindings
    for (const binding of this._bindings) {
      binding.consume();
    }

    this._pendingJustPressed = false;
    this._pendingJustReleased = false;
  }

  /**
   * Reset the action state
   */
  private _reset(): void {
    this._cachedPressed = false;
    this._cachedState = BS.Idle;
    this._currentDuration = 0;
    this._pendingJustPressed = false;
    this._pendingJustReleased = false;
    this._frameJustPressed = false;
    this._frameJustReleased = false;
    this._suppressNextSampleEdges = false;
    this._updatesSinceSample = 0;
    this._bufferedDelta = 0;
    this._sampleStalled = false;

    for (const binding of this._bindings) {
      binding.consume();
    }

    for (const interaction of this._interactions) {
      interaction.reset();
    }
  }

  /**
   * Process interactions and fire callbacks
   */
  private _processInteractions(ctx: InteractionContext): void {
    for (const interaction of this._interactions) {
      const phase = interaction.process(ctx);
      if (phase) {
        this._fireCallbacks(phase);
      }
    }
  }

  private _getEffectiveDelta(dt: number): number {
    this._updatesSinceSample += 1;

    if (this._updatesSinceSample === 1) {
      return dt;
    }

    if (this._sampleStalled) {
      return dt;
    }

    if (this._updatesSinceSample <= MAX_DUPLICATE_UPDATES) {
      this._bufferedDelta += dt;
      return 0;
    }

    this._sampleStalled = true;
    const appliedDelta = dt + this._bufferedDelta;
    this._bufferedDelta = 0;
    return appliedDelta;
  }

  /**
   * Fire callbacks for a given phase
   */
  private _fireCallbacks(phase: InteractionPhase): void {
    const callbackCtx: ActionCallbackContext = {
      action: this,
      value: this._cachedPressed ? 1 : 0,
      duration: this._currentDuration,
      phase,
    };

    switch (phase) {
      case "started":
        for (const cb of this._onStarted) {
          cb(callbackCtx);
        }
        break;
      case "performed":
        for (const cb of this._onPerformed) {
          cb(callbackCtx);
        }
        break;
      case "canceled":
        for (const cb of this._onCanceled) {
          cb(callbackCtx);
        }
        break;
    }
  }
}

/**
 * Create an InputAction from a configuration object
 */
export function createInputAction(config: InputActionConfig): InputAction {
  return new InputAction(config);
}
