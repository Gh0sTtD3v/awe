/**
 * Bindings connect physical input controls to actions.
 *
 * Two main binding types:
 * - ButtonBinding: For discrete inputs with press/release tracking (buttons)
 * - ValueBinding<T>: For continuous inputs (axes, deltas)
 *
 * Bindings use a sample/consume pattern:
 * - sample(): Captures current state from ControlState (called once per render frame)
 * - read()/isPressed(): Returns the sampled value
 * - consume(): Clears edge state (called after consumer processes input)
 *
 * Use the Bindings factory for convenience methods.
 *
 * @module bindings
 */

import type {
  ControlStateManager,
  GamepadButtonName,
  GamepadAxisName,
} from "./control-state";
import { GamepadButtons, GamepadAxes } from "./control-state";
import type {
  ScalarProcessorConfig,
  Vector2ProcessorConfig,
} from "./processors";
import { createProcessor, createVector2Processor } from "./processors";

/**
 * Vector2 type for 2D bindings (movement, look, etc.)
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Base binding interface
 * A binding connects to a device control (eg: keyboard key, gamepad button, mouse button, etc.)
 * And provides sampled state for consumers (eg: input actions)
 *
 * We use a model of 'sample/consume' to separate input sampling by controls
 * from its consumption by consumers (eg: input actions). This is because
 * sampling rate might be different from consumer frame rate (eg sampling is
 * done in a render frame while consumption is done in fixed physics frame).
 *
 * Sampling is always done at render frame rate via INPUT_STATE_READY event.
 * Consumers must always call consume() in order to clear the consumed state
 * (eg: just pressed / just released).
 */
export interface Binding {
  /** Binding type identifier */
  type: unknown;
  /**
   * Sample the current state from control state.
   * Called once per render frame when INPUT_STATE_READY is emitted.
   */
  sample(state: ControlStateManager): void;
  /**
   * Consume the binding value.
   * Resets consumer-dependent state (eg: just pressed / just released).
   * Called after the consumer has processed the input.
   */
  consume(): void;
}

/**
 * Value binding - for continuous inputs (axes, deltas, etc.)
 */
export interface ValueBinding<T = unknown> extends Binding {
  /** Read the current/accumulated value (no state param - uses sampled data) */
  read(): T;

  combine: (bindings: ValueBinding<T>[]) => T;
}

/**
 * We use enum instead of booleans
 * Idle: justPressed: false, justReleased: false
 * JustPressed: justPressed: true, justReleased: false
 * JustReleased: justPressed: false, justReleased: true
 * A button can not be in both JustPressed and JustReleased states at the same time
 */
export enum ButtonState {
  Idle,
  JustPressed,
  JustReleased,
}

/**
 * Button binding - for discrete inputs (buttons, keys)
 */
export interface ButtonBinding extends Binding {
  /** Check if the binding is currently pressed (no state param - uses sampled data) */
  isPressed(): boolean;
  /** Get the current button state (JustPressed, JustReleased, or Idle) */
  getState(): ButtonState;
}

// ============================================================================
// Keyboard Bindings
// ============================================================================

/**
 * Keyboard key axis binding - for movement composites (WASD, arrows)
 * Returns 1 when pressed, 0 when not pressed
 */
export interface KeyAxisBinding extends ValueBinding<number> {
  type: "keyAxis";
  code: string;
}

/**
 * Keyboard key button binding - for discrete actions (jump, fire)
 * Tracks JustPressed/JustReleased state
 */
export interface KeyButtonBinding extends ButtonBinding {
  type: "keyButton";
  code: string;
}

/**
 * Backward compatibility alias
 * @deprecated Use KeyAxisBinding or KeyButtonBinding
 */
export type KeyBinding = KeyAxisBinding;

// ============================================================================
// Gamepad Bindings
// ============================================================================

/**
 * Gamepad button binding
 */
export type GamepadButton = GamepadButtonName | number;
export interface GamepadButtonBinding extends ButtonBinding {
  type: "gamepadButton";
  button: GamepadButton;
}

/**
 * Gamepad axis binding
 */
export type GamepadAxis = GamepadAxisName | number;
export interface GamepadAxisBinding extends ValueBinding<number> {
  type: "gamepadAxis";
  axis: GamepadAxis;
  /** Invert the axis value */
  invert?: boolean;
}

/**
 * Gamepad stick binding (returns Vector2)
 */
export interface GamepadStickBinding extends ValueBinding<Vector2> {
  type: "gamepadStick";
  stick: "left" | "right";
  /** Deadzone threshold (default: 0.15) */
  deadzone?: number;
}

/**
 * D-Pad binding (returns Vector2)
 */
export interface DPadBinding extends ValueBinding<Vector2> {
  type: "dpad";
}

// ============================================================================
// Mouse Bindings
// ============================================================================

/**
 * Mouse button binding
 */
export interface MouseButtonBinding extends ButtonBinding {
  type: "mouseButton";
  button: number; // 0=left, 1=middle, 2=right
}

/**
 * Mouse delta binding (returns Vector2)
 * Reads accumulated mouse movement delta from the frame
 */
export interface MouseDeltaBinding extends ValueBinding<Vector2> {
  type: "mouseDelta";
  requirePointerLock?: boolean;
}

/**
 * Mouse wheel binding (returns number)
 * Reads accumulated mouse wheel delta from the frame.
 * Positive values typically indicate scrolling down/away.
 */
export interface MouseWheelBinding extends ValueBinding<number> {
  type: "mouseWheel";
}

// ============================================================================
// Touch Bindings
// ============================================================================

/**
 * Touch tap binding
 */
export interface TouchTapBinding extends ButtonBinding {
  type: "touchTap";
}

/**
 * Touch joystick binding (for axis)
 */
export interface TouchJoystickBinding extends ValueBinding<number> {
  type: "touchJoystick";
  axis: "x" | "y";
}

/**
 * Touch joystick Vector2 binding
 */
export interface TouchJoystickVector2Binding extends ValueBinding<Vector2> {
  type: "touchJoystickVector2";
}

/**
 * Touch position binding (returns Vector2)
 */
export interface TouchPositionBinding extends ValueBinding<Vector2> {
  type: "touchPosition";
}

/**
 * Touch delta binding (returns Vector2)
 */
export interface TouchDeltaBinding extends ValueBinding<Vector2> {
  type: "touchDelta";
}

// ============================================================================
// Custom Bindings
// ============================================================================

/**
 * Imperative custom button binding.
 * Useful for binding actions to external UI controls.
 */
export interface CustomButtonBinding extends ButtonBinding {
  type: "customButton";
  event: string;
}

/**
 * Imperative custom scalar binding.
 * Useful for app-driven analog controls such as sliders or triggers.
 */
export interface CustomValueBinding extends ValueBinding<number> {
  type: "customValue";
  event: string;
}

/**
 * Imperative custom Vector2 binding.
 * Useful for app-driven virtual sticks, look pads, or drag surfaces.
 */
export interface CustomVector2Binding extends ValueBinding<Vector2> {
  type: "customVector2";
  event: string;
}

// ============================================================================
// Composite Bindings
// ============================================================================

/**
 * Composite binding that combines two buttons into an axis (-1 to 1)
 */
export interface CompositeAxis1DBinding extends ValueBinding<number> {
  type: "compositeAxis1D";
  negative: ValueBinding<number>;
  positive: ValueBinding<number>;
}

/**
 * Composite binding that combines multiple bindings into a Vector2
 */
export interface CompositeVector2Binding extends ValueBinding<Vector2> {
  type: "compositeVector2";
  up: ValueBinding<number>;
  down: ValueBinding<number>;
  left: ValueBinding<number>;
  right: ValueBinding<number>;
}

/**
 * Composite binding that is pressed when any child button binding is pressed
 */
export interface CompositeButtonAnyBinding extends ButtonBinding {
  type: "compositeButtonAny";
  bindings: ButtonBinding[];
}

/**
 * Composite binding that is pressed only when all child button bindings are pressed
 */
export interface CompositeButtonAllBinding extends ButtonBinding {
  type: "compositeButtonAll";
  bindings: ButtonBinding[];
}

// ============================================================================
// Binding Config Types - Pure data, no state
// ============================================================================

/** Config for keyboard axis binding */
export interface KeyAxisConfig {
  type: "keyAxis";
  code: string;
}

/** Config for keyboard button binding */
export interface KeyButtonConfig {
  type: "keyButton";
  code: string;
}

/** Config for gamepad button binding */
export interface GamepadButtonConfig {
  type: "gamepadButton";
  button: GamepadButton;
}

/** Config for gamepad axis binding */
export interface GamepadAxisConfig {
  type: "gamepadAxis";
  axis: GamepadAxis;
  invert?: boolean;
}

/** Config for gamepad stick binding */
export interface GamepadStickConfig {
  type: "gamepadStick";
  stick: "left" | "right";
  deadzone?: number;
}

/** Config for D-Pad binding */
export interface DPadConfig {
  type: "dpad";
}

/** Config for mouse button binding */
export interface MouseButtonConfig {
  type: "mouseButton";
  button: number;
}

/** Config for mouse delta binding */
export interface MouseDeltaConfig {
  type: "mouseDelta";
  requirePointerLock?: boolean;
}

/** Config for mouse wheel binding */
export interface MouseWheelConfig {
  type: "mouseWheel";
}

/** Config for touch tap binding */
export interface TouchTapConfig {
  type: "touchTap";
}

/** Config for touch joystick axis binding */
export interface TouchJoystickConfig {
  type: "touchJoystick";
  axis: "x" | "y";
}

/** Config for touch joystick Vector2 binding */
export interface TouchJoystickVector2Config {
  type: "touchJoystickVector2";
}

/** Config for touch position binding */
export interface TouchPositionConfig {
  type: "touchPosition";
}

/** Config for touch delta binding */
export interface TouchDeltaConfig {
  type: "touchDelta";
}

/** Config for custom button binding */
export interface CustomButtonConfig {
  type: "customButton";
  event: string;
}

/** Config for custom scalar binding */
export interface CustomValueConfig {
  type: "customValue";
  event: string;
}

/** Config for custom Vector2 binding */
export interface CustomVector2Config {
  type: "customVector2";
  event: string;
}

/** Config for composite 1D axis binding */
export interface CompositeAxis1DConfig {
  type: "compositeAxis1D";
  negative: ValueBindingConfig<number>;
  positive: ValueBindingConfig<number>;
}

/** Config for composite Vector2 binding */
export interface CompositeVector2Config {
  type: "compositeVector2";
  up: ValueBindingConfig<number>;
  down: ValueBindingConfig<number>;
  left: ValueBindingConfig<number>;
  right: ValueBindingConfig<number>;
}

/** Config for composite button OR binding */
export interface CompositeButtonAnyConfig {
  type: "compositeButtonAny";
  bindings: readonly ButtonBindingConfig[];
}

/** Config for composite button AND binding */
export interface CompositeButtonAllConfig {
  type: "compositeButtonAll";
  bindings: readonly ButtonBindingConfig[];
}

/** Union of all button binding configs */
export type ButtonBindingConfig =
  | KeyButtonConfig
  | GamepadButtonConfig
  | MouseButtonConfig
  | TouchTapConfig
  | CustomButtonConfig
  | CompositeButtonAnyConfig
  | CompositeButtonAllConfig;

type ScalarValueBindingConfig =
  | KeyAxisConfig
  | GamepadAxisConfig
  | MouseWheelConfig
  | TouchJoystickConfig
  | CustomValueConfig
  | CompositeAxis1DConfig;

type Vector2ValueBindingConfig =
  | GamepadStickConfig
  | DPadConfig
  | MouseDeltaConfig
  | TouchJoystickVector2Config
  | TouchPositionConfig
  | TouchDeltaConfig
  | CustomVector2Config
  | CompositeVector2Config;

/** Union of all value binding configs for a given type */
export type ValueBindingConfig<T> = T extends Vector2
  ? Vector2ValueBindingConfig & {
      processors?: readonly Vector2ProcessorConfig[];
    }
  : ScalarValueBindingConfig & {
      processors?: readonly ScalarProcessorConfig[];
    };

/** Union of all binding configs */
export type BindingConfig =
  | ButtonBindingConfig
  | ValueBindingConfig<number>
  | ValueBindingConfig<Vector2>;

// ============================================================================
// Binding Factory Functions
// ============================================================================

/**
 * Helper to create button state management (shared by all button bindings)
 */
function createButtonState() {
  let _currentPressed = false;
  let _wasPressed = false;
  let _wasReleased = false;

  return {
    update(pressed: boolean) {
      if (pressed && !_currentPressed) _wasPressed = true;
      if (!pressed && _currentPressed) _wasReleased = true;
      _currentPressed = pressed;
    },
    isPressed: () => _currentPressed,
    getState(): ButtonState {
      if (_wasPressed) return ButtonState.JustPressed;
      if (_wasReleased && !_wasPressed) return ButtonState.JustReleased;
      return ButtonState.Idle;
    },
    consume() {
      _wasPressed = false;
      _wasReleased = false;
    },
  };
}

function createKeyAxisBinding(code: string): KeyAxisBinding {
  let _value = 0;

  return {
    type: "keyAxis",
    code,
    sample(state: ControlStateManager): void {
      _value = state.keyboard.isKeyDown(code) ? 1 : 0;
    },
    read(): number {
      return _value;
    },
    consume(): void {
      // No-op for stateless axis bindings
    },
    combine: combineBinding.number.first,
  };
}

function createKeyButtonBinding(code: string): KeyButtonBinding {
  const state = createButtonState();
  return {
    type: "keyButton",
    code,
    sample(ctrl: ControlStateManager): void {
      state.update(ctrl.keyboard.isKeyDown(code));
    },
    isPressed: state.isPressed,
    getState: state.getState,
    consume: state.consume,
  };
}

function createGamepadButtonBinding(
  button: GamepadButtonName | number
): GamepadButtonBinding {
  const state = createButtonState();
  return {
    type: "gamepadButton",
    button,
    sample(ctrl: ControlStateManager): void {
      state.update(ctrl.gamepad.isButtonDown(button));
    },
    isPressed: state.isPressed,
    getState: state.getState,
    consume: state.consume,
  };
}

function createGamepadAxisBinding(
  axis: GamepadAxisName | number,
  invert = false
): GamepadAxisBinding {
  let _value = 0;

  return {
    type: "gamepadAxis",
    axis,
    invert,
    sample(state: ControlStateManager): void {
      let value = state.gamepad.getAxis(axis);
      if (invert) value = -value;
      _value = value;
    },
    read(): number {
      return _value;
    },
    consume(): void {
      // No-op for stateless axis bindings
    },
    combine: combineBinding.number.first,
  };
}

function createMouseButtonBinding(button: number): MouseButtonBinding {
  const state = createButtonState();
  return {
    type: "mouseButton",
    button,
    sample(ctrl: ControlStateManager): void {
      state.update(ctrl.mouse.isButtonDown(button));
    },
    isPressed: state.isPressed,
    getState: state.getState,
    consume: state.consume,
  };
}

function createTouchTapBinding(): TouchTapBinding {
  const state = createButtonState();
  return {
    type: "touchTap",
    sample(ctrl: ControlStateManager): void {
      state.update(ctrl.touch.isTouching);
    },
    isPressed: state.isPressed,
    getState: state.getState,
    consume: state.consume,
  };
}

function createCustomButtonBinding(event: string): CustomButtonBinding {
  const state = createButtonState();
  return {
    type: "customButton",
    event,
    sample(ctrl: ControlStateManager): void {
      state.update(ctrl.custom.isButtonDown(event));
    },
    isPressed: state.isPressed,
    getState: state.getState,
    consume: state.consume,
  };
}

function createCustomValueBinding(event: string): CustomValueBinding {
  let _value = 0;

  return {
    type: "customValue",
    event,
    sample(ctrl: ControlStateManager): void {
      _value = ctrl.custom.getValue(event);
    },
    read(): number {
      return _value;
    },
    consume(): void {
      // No-op for stateless scalar bindings
    },
    combine: combineBinding.number.first,
  };
}

function createCustomVector2Binding(event: string): CustomVector2Binding {
  let _value: Vector2 = { x: 0, y: 0 };

  return {
    type: "customVector2",
    event,
    sample(ctrl: ControlStateManager): void {
      _value = ctrl.custom.getVector2(event);
    },
    read(): Vector2 {
      return _value;
    },
    consume(): void {
      // No-op for stateless Vector2 bindings
    },
    combine: combineBinding.vector2.first,
  };
}

function createTouchJoystickBinding(axis: "x" | "y"): TouchJoystickBinding {
  let _value = 0;

  return {
    type: "touchJoystick",
    axis,
    sample(state: ControlStateManager): void {
      _value = axis === "x" ? state.touch.joystickX : state.touch.joystickY;
    },
    read(): number {
      return _value;
    },
    consume(): void {
      // No-op for stateless axis bindings
    },
    combine: combineBinding.number.first,
  };
}

function createCompositeAxis1DBinding(
  negative: ValueBinding<number>,
  positive: ValueBinding<number>
): CompositeAxis1DBinding {
  return {
    type: "compositeAxis1D",
    negative,
    positive,
    sample(state: ControlStateManager): void {
      negative.sample(state);
      positive.sample(state);
    },
    read(): number {
      const neg = negative.read();
      const pos = positive.read();
      return pos - neg;
    },
    consume(): void {
      negative.consume();
      positive.consume();
    },
    combine: combineBinding.number.first,
  };
}

function createCompositeVector2Binding(
  up: ValueBinding<number>,
  down: ValueBinding<number>,
  left: ValueBinding<number>,
  right: ValueBinding<number>
): CompositeVector2Binding {
  return {
    type: "compositeVector2",
    up,
    down,
    left,
    right,
    sample(state: ControlStateManager): void {
      up.sample(state);
      down.sample(state);
      left.sample(state);
      right.sample(state);
    },
    read(): Vector2 {
      const u = up.read();
      const d = down.read();
      const l = left.read();
      const r = right.read();
      return { x: r - l, y: u - d };
    },
    consume(): void {
      up.consume();
      down.consume();
      left.consume();
      right.consume();
    },
    combine: combineBinding.vector2.first,
  };
}

function createCompositeButtonBinding(
  type: CompositeButtonAnyBinding["type"] | CompositeButtonAllBinding["type"],
  bindings: ButtonBinding[]
): CompositeButtonAnyBinding | CompositeButtonAllBinding {
  const state = createButtonState();
  const matches =
    type === "compositeButtonAll"
      ? () => bindings.length > 0 && bindings.every((binding) => binding.isPressed())
      : () => bindings.some((binding) => binding.isPressed());

  return {
    type,
    bindings,
    sample(ctrl: ControlStateManager): void {
      for (const binding of bindings) {
        binding.sample(ctrl);
      }
      state.update(matches());
    },
    isPressed: state.isPressed,
    getState: state.getState,
    consume(): void {
      state.consume();
      for (const binding of bindings) {
        binding.consume();
      }
    },
  };
}

function createGamepadStickBinding(
  stick: "left" | "right",
  deadzone = 0.15
): GamepadStickBinding {
  const xAxis = stick === "left" ? GamepadAxes.LeftX : GamepadAxes.RightX;
  const yAxis = stick === "left" ? GamepadAxes.LeftY : GamepadAxes.RightY;
  let _value: Vector2 = { x: 0, y: 0 };

  return {
    type: "gamepadStick",
    stick,
    deadzone,
    sample(state: ControlStateManager): void {
      let x = state.gamepad.getAxis(xAxis);
      let y = -state.gamepad.getAxis(yAxis); // Invert Y for standard up=positive

      // Apply deadzone
      if (Math.abs(x) < deadzone) x = 0;
      if (Math.abs(y) < deadzone) y = 0;

      _value = { x, y };
    },
    read(): Vector2 {
      return _value;
    },
    consume(): void {
      // No-op for stateless axis bindings
    },
    combine: combineBinding.vector2.first,
  };
}

function createTouchJoystickVector2Binding(): TouchJoystickVector2Binding {
  let _value: Vector2 = { x: 0, y: 0 };

  return {
    type: "touchJoystickVector2",
    sample(state: ControlStateManager): void {
      _value = { x: state.touch.joystickX, y: state.touch.joystickY };
    },
    read(): Vector2 {
      return _value;
    },
    consume(): void {
      // No-op for stateless axis bindings
    },
    combine: combineBinding.vector2.first,
  };
}

function createTouchPositionBinding(): TouchPositionBinding {
  let _value: Vector2 = { x: 0, y: 0 };

  return {
    type: "touchPosition",
    sample(state: ControlStateManager): void {
      _value = state.touch.position;
    },
    read(): Vector2 {
      return _value;
    },
    consume(): void {
      // No-op for stateless position bindings
    },
    combine: combineBinding.vector2.first,
  };
}

function createDPadBinding(): DPadBinding {
  let _value: Vector2 = { x: 0, y: 0 };

  return {
    type: "dpad",
    sample(state: ControlStateManager): void {
      const up = state.gamepad.isButtonDown(GamepadButtons.DPadUp) ? 1 : 0;
      const down = state.gamepad.isButtonDown(GamepadButtons.DPadDown) ? 1 : 0;
      const left = state.gamepad.isButtonDown(GamepadButtons.DPadLeft) ? 1 : 0;
      const right = state.gamepad.isButtonDown(GamepadButtons.DPadRight)
        ? 1
        : 0;
      _value = { x: right - left, y: up - down };
    },
    read(): Vector2 {
      return _value;
    },
    consume(): void {
      // No-op for stateless axis bindings
    },
    combine: combineBinding.vector2.first,
  };
}

function isPointerLocked(): boolean {
  return typeof document !== "undefined" && document.pointerLockElement != null;
}

function createMouseDeltaBinding(
  requirePointerLock = false,
): MouseDeltaBinding {
  type PendingDelta = {
    x: number;
    y: number;
    remainingUpdates: number | null;
  };

  const _queue: PendingDelta[] = [];
  let _updatesSinceSample = 0;
  let _state: ControlStateManager | null = null;

  const resolveRemainingUpdates = (entry: PendingDelta): number => {
    if (entry.remainingUpdates == null) {
      const expected = Math.max(
        1,
        Math.floor(_state?.expectedFixedUpdates ?? 1)
      );
      entry.remainingUpdates = expected;
    }
    return entry.remainingUpdates;
  };

  return {
    type: "mouseDelta",
    requirePointerLock,
    sample(state: ControlStateManager): void {
      if (requirePointerLock && !isPointerLocked()) {
        _queue.length = 0;
        _updatesSinceSample = 0;
        _state = state;
        return;
      }

      const delta = state.mouse.delta;
      _state = state;

      if (delta.x !== 0 || delta.y !== 0) {
        if (_updatesSinceSample === 0 && _queue.length > 0) {
          // No updates since last sample: merge residuals.
          const last = _queue[_queue.length - 1];
          last.x += delta.x;
          last.y += delta.y;
          last.remainingUpdates = null;
        } else {
          _queue.push({
            x: delta.x,
            y: delta.y,
            remainingUpdates: null,
          });
        }
      }

      _updatesSinceSample = 0;
    },
    read(): Vector2 {
      if (_queue.length === 0) {
        return { x: 0, y: 0 };
      }

      const head = _queue[0];

      // If not in fixed loop, return full delta (render-loop consumption)
      if (!_state?.insideFixedLoop) {
        return { x: head.x, y: head.y };
      }

      const count = resolveRemainingUpdates(head);
      return { x: head.x / count, y: head.y / count };
    },
    consume(): void {
      if (_queue.length === 0) return;

      const head = _queue[0];
      _updatesSinceSample += 1;

      // If not in fixed loop, consume entire delta
      if (!_state?.insideFixedLoop) {
        _queue.shift();
        return;
      }

      // Fixed loop: distribute delta
      const count = resolveRemainingUpdates(head);
      head.x -= head.x / count;
      head.y -= head.y / count;
      head.remainingUpdates = count - 1;

      if (head.remainingUpdates <= 0) {
        _queue.shift();
      }
    },
    combine: combineBinding.vector2.sum,
  };
}

function createTouchDeltaBinding(): TouchDeltaBinding {
  type PendingDelta = {
    x: number;
    y: number;
    remainingUpdates: number | null;
  };

  const _queue: PendingDelta[] = [];
  let _updatesSinceSample = 0;
  let _state: ControlStateManager | null = null;

  const resolveRemainingUpdates = (entry: PendingDelta): number => {
    if (entry.remainingUpdates == null) {
      const expected = Math.max(
        1,
        Math.floor(_state?.expectedFixedUpdates ?? 1)
      );
      entry.remainingUpdates = expected;
    }
    return entry.remainingUpdates;
  };

  return {
    type: "touchDelta",
    sample(state: ControlStateManager): void {
      const delta = state.touch.delta;
      _state = state;

      if (delta.x !== 0 || delta.y !== 0) {
        if (_updatesSinceSample === 0 && _queue.length > 0) {
          const last = _queue[_queue.length - 1];
          last.x += delta.x;
          last.y += delta.y;
          last.remainingUpdates = null;
        } else {
          _queue.push({
            x: delta.x,
            y: delta.y,
            remainingUpdates: null,
          });
        }
      }

      _updatesSinceSample = 0;
    },
    read(): Vector2 {
      if (_queue.length === 0) {
        return { x: 0, y: 0 };
      }

      const head = _queue[0];
      if (!_state?.insideFixedLoop) {
        return { x: head.x, y: head.y };
      }

      const count = resolveRemainingUpdates(head);
      return { x: head.x / count, y: head.y / count };
    },
    consume(): void {
      if (_queue.length === 0) return;

      const head = _queue[0];
      _updatesSinceSample += 1;

      if (!_state?.insideFixedLoop) {
        _queue.shift();
        return;
      }

      const count = resolveRemainingUpdates(head);
      head.x -= head.x / count;
      head.y -= head.y / count;
      head.remainingUpdates = count - 1;

      if (head.remainingUpdates <= 0) {
        _queue.shift();
      }
    },
    combine: combineBinding.vector2.sum,
  };
}

function withNumberProcessors(
  binding: ValueBinding<number>,
  processors?: readonly ScalarProcessorConfig[],
): ValueBinding<number> {
  if (!processors || processors.length === 0) {
    return binding;
  }

  const pipeline = processors.map((processor) => createProcessor(processor));

  return {
    ...binding,
    read(): number {
      let value = binding.read();
      for (const processor of pipeline) {
        value = processor(value);
      }
      return value;
    },
  };
}

function withVector2Processors(
  binding: ValueBinding<Vector2>,
  processors?: readonly Vector2ProcessorConfig[],
): ValueBinding<Vector2> {
  if (!processors || processors.length === 0) {
    return binding;
  }

  const pipeline = processors.map((processor) => createVector2Processor(processor));

  return {
    ...binding,
    sample(state: ControlStateManager): void {
      binding.sample(state);
    },
    read(): Vector2 {
      let value = binding.read();
      for (const processor of pipeline) {
        value = processor(value);
      }
      return value;
    },
    consume(): void {
      binding.consume();
    },
  };
}

function createMouseWheelBinding(): MouseWheelBinding {
  type PendingWheel = {
    value: number;
    remainingUpdates: number | null;
  };

  const _queue: PendingWheel[] = [];
  let _updatesSinceSample = 0;
  let _state: ControlStateManager | null = null;

  const resolveRemainingUpdates = (entry: PendingWheel): number => {
    if (entry.remainingUpdates == null) {
      const expected = Math.max(
        1,
        Math.floor(_state?.expectedFixedUpdates ?? 1)
      );
      entry.remainingUpdates = expected;
    }
    return entry.remainingUpdates;
  };

  return {
    type: "mouseWheel",
    sample(state: ControlStateManager): void {
      const delta = state.mouse.wheelDelta;
      _state = state;

      if (delta !== 0) {
        if (_updatesSinceSample === 0 && _queue.length > 0) {
          const last = _queue[_queue.length - 1];
          last.value += delta;
          last.remainingUpdates = null;
        } else {
          _queue.push({
            value: delta,
            remainingUpdates: null,
          });
        }
      }

      _updatesSinceSample = 0;
    },
    read(): number {
      if (_queue.length === 0) {
        return 0;
      }

      const head = _queue[0];

      // If not in fixed loop, return full delta (render-loop consumption)
      if (!_state?.insideFixedLoop) {
        return head.value;
      }

      const count = resolveRemainingUpdates(head);
      return head.value / count;
    },
    consume(): void {
      if (_queue.length === 0) return;

      const head = _queue[0];
      _updatesSinceSample += 1;

      // If not in fixed loop, consume entire delta
      if (!_state?.insideFixedLoop) {
        _queue.shift();
        return;
      }

      // Fixed loop: distribute delta
      const count = resolveRemainingUpdates(head);
      head.value -= head.value / count;
      head.remainingUpdates = count - 1;

      if (head.remainingUpdates <= 0) {
        _queue.shift();
      }
    },
    combine: combineBinding.number.sum,
  };
}

// ============================================================================
// Device-based Binding Factories
// ============================================================================

/**
 * Keyboard bindings factory.
 * Returns config objects (pure data). Use createBindingFromConfig() to instantiate.
 *
 * @example
 * ```ts
 * Keyboard.button("Space")  // Button with press/release tracking
 * Keyboard.axis("KeyW")     // Returns 1 when pressed, 0 otherwise
 * Keyboard.wasd()           // WASD as Vector2
 * Keyboard.arrows()         // Arrow keys as Vector2
 * ```
 */
export const Keyboard = {
  /**
   * Create a keyboard button binding config with press/release tracking.
   * Use for button-type actions (jump, fire, interact).
   * @param code - KeyboardEvent.code value (e.g., "Space", "KeyE")
   */
  button(code: string): KeyButtonConfig {
    return { type: "keyButton", code };
  },

  /**
   * Create a keyboard button OR binding config.
   * Useful for alternative keys that should map to the same intent.
   * @param codes - KeyboardEvent.code values (e.g., "ControlLeft", "ControlRight")
   */
  any(...codes: string[]): CompositeButtonAnyConfig {
    return Composite.any(...codes.map((code) => Keyboard.button(code)));
  },

  /**
   * Create a keyboard axis binding config.
   * Returns 1 when pressed, 0 when not pressed.
   * Use for composites (WASD, axis1D). Does NOT track press/release state.
   * @param code - KeyboardEvent.code value (e.g., "KeyW", "ArrowUp")
   */
  axis(code: string): KeyAxisConfig {
    return { type: "keyAxis", code };
  },

  /**
   * Create WASD movement binding config (returns Vector2)
   */
  wasd(): CompositeVector2Config {
    return {
      type: "compositeVector2",
      up: { type: "keyAxis", code: "KeyW" },
      down: { type: "keyAxis", code: "KeyS" },
      left: { type: "keyAxis", code: "KeyA" },
      right: { type: "keyAxis", code: "KeyD" },
    };
  },

  /**
   * Create arrow keys movement binding config (returns Vector2)
   */
  arrows(): CompositeVector2Config {
    return {
      type: "compositeVector2",
      up: { type: "keyAxis", code: "ArrowUp" },
      down: { type: "keyAxis", code: "ArrowDown" },
      left: { type: "keyAxis", code: "ArrowLeft" },
      right: { type: "keyAxis", code: "ArrowRight" },
    };
  },
};

/**
 * Gamepad bindings factory.
 * Returns config objects (pure data). Use createBindingFromConfig() to instantiate.
 *
 * @example
 * ```ts
 * Gamepad.button("A")       // Face button
 * Gamepad.axis("LeftX")     // Single axis
 * Gamepad.leftStick()       // Left stick as Vector2
 * Gamepad.rightStick()      // Right stick as Vector2
 * Gamepad.dpad()            // D-Pad as Vector2
 * ```
 */
export const Gamepad = {
  /**
   * Create a gamepad button binding config
   * @param button - Button name or index
   */
  button(button: GamepadButtonName | number): GamepadButtonConfig {
    return { type: "gamepadButton", button };
  },

  /**
   * Create a gamepad axis binding config
   * @param axis - Axis name or index
   * @param invert - Whether to invert the axis
   */
  axis(axis: GamepadAxisName | number, invert = false): GamepadAxisConfig {
    return { type: "gamepadAxis", axis, invert };
  },

  /**
   * Create a left stick binding config (returns Vector2)
   * @param deadzone - Deadzone threshold (default: 0.15)
   */
  leftStick(deadzone = 0.15): GamepadStickConfig {
    return { type: "gamepadStick", stick: "left", deadzone };
  },

  /**
   * Create a right stick binding config (returns Vector2)
   * @param deadzone - Deadzone threshold (default: 0.15)
   */
  rightStick(deadzone = 0.15): GamepadStickConfig {
    return { type: "gamepadStick", stick: "right", deadzone };
  },

  /**
   * Create a D-Pad binding config (returns Vector2)
   */
  dpad(): DPadConfig {
    return { type: "dpad" };
  },
};

/**
 * Mouse bindings factory.
 * Returns config objects (pure data). Use createBindingFromConfig() to instantiate.
 *
 * @example
 * ```ts
 * Mouse.button(0)    // Left button (0=left, 1=middle, 2=right)
 * Mouse.delta()      // Movement delta as Vector2
 * Mouse.wheel()      // Wheel delta as number
 * ```
 */
export const Mouse = {
  /**
   * Create a mouse button binding config
   * @param button - Button index (0=left, 1=middle, 2=right)
   */
  button(button: number): MouseButtonConfig {
    return { type: "mouseButton", button };
  },

  /**
   * Create a mouse delta binding config (returns Vector2)
   * Reads accumulated mouse movement delta from the frame
   */
  delta(options: { requirePointerLock?: boolean } = {}): MouseDeltaConfig {
    return { type: "mouseDelta", requirePointerLock: options.requirePointerLock };
  },

  /**
   * Create a mouse delta binding that only emits while pointer lock is active.
   * Useful for desktop look controls that should not rotate on free cursor movement.
   */
  pointerLockDelta(): MouseDeltaConfig {
    return { type: "mouseDelta", requirePointerLock: true };
  },

  /**
   * Create a mouse wheel binding config (returns number)
   * Reads accumulated mouse wheel delta from the frame.
   * Positive values typically indicate scrolling down/away.
   */
  wheel(): MouseWheelConfig {
    return { type: "mouseWheel" };
  },
};

/**
 * Touch bindings factory.
 * Returns config objects (pure data). Use createBindingFromConfig() to instantiate.
 *
 * @example
 * ```ts
 * Touch.tap()              // Tap as button
 * Touch.joystick()         // Virtual joystick as Vector2
 * Touch.joystickAxis("x")  // Single joystick axis
 * Touch.position()         // Primary touch position as Vector2
 * Touch.delta()            // Primary touch delta as Vector2
 * ```
 */
export const Touch = {
  /**
   * Create a touch tap binding config
   */
  tap(): TouchTapConfig {
    return { type: "touchTap" };
  },

  /**
   * Create a touch joystick binding config (returns Vector2)
   */
  joystick(): TouchJoystickVector2Config {
    return { type: "touchJoystickVector2" };
  },

  /**
   * Create a touch joystick axis binding config
   * @param axis - Which axis ("x" or "y")
   */
  joystickAxis(axis: "x" | "y"): TouchJoystickConfig {
    return { type: "touchJoystick", axis };
  },

  /**
   * Create a touch position binding config (returns Vector2)
   */
  position(): TouchPositionConfig {
    return { type: "touchPosition" };
  },

  /**
   * Create a touch delta binding config (returns Vector2)
   */
  delta(): TouchDeltaConfig {
    return { type: "touchDelta" };
  },
};

/**
 * Custom bindings factory.
 * Returns config objects for imperative app-driven inputs.
 *
 * @example
 * ```ts
 * const inputs = createInputs({
 *   Jump: {
 *     type: "button",
  *     bindings: [Custom.button("jump"), Keyboard.button("Space")],
  *   },
 *   Throttle: {
 *     type: "value",
 *     bindings: [Custom.value("throttle")],
 *   },
 *   Aim: {
 *     type: "vector2",
 *     bindings: [Custom.vector2("aim")],
 *   },
 * });
 *
 * sharedControlState.custom.pressButton("jump");
 * sharedControlState.custom.releaseButton("jump");
 * sharedControlState.custom.setValue("throttle", 0.75);
 * sharedControlState.custom.setVector2("aim", 0.2, -0.4);
 * ```
 */
export const Custom = {
  /**
   * Create a custom button binding config.
   * @param event - Arbitrary app-defined event name (e.g. "jump")
   */
  button(event: string): CustomButtonConfig {
    return { type: "customButton", event };
  },

  /**
   * Create a custom scalar binding config.
   * @param event - Arbitrary app-defined control name (e.g. "throttle")
   */
  value(event: string): CustomValueConfig {
    return { type: "customValue", event };
  },

  /**
   * Create a custom Vector2 binding config.
   * @param event - Arbitrary app-defined control name (e.g. "aim")
   */
  vector2(event: string): CustomVector2Config {
    return { type: "customVector2", event };
  },
};

/**
 * Composite bindings factory for combining multiple bindings.
 * Returns config objects (pure data). Use createBindingFromConfig() to instantiate.
 *
 * @example
 * ```ts
 * Composite.axis1D(Keyboard.axis("KeyA"), Keyboard.axis("KeyD"))  // -1 to 1
 * Composite.vector2(up, down, left, right)                        // Vector2
 * Composite.any(Keyboard.button("KeyE"), Mouse.button(0))         // Button OR
 * Composite.all(Keyboard.any("ControlLeft", "ControlRight"), Mouse.button(0))
 *                                                                  // Button AND
 * ```
 */
export const Composite = {
  /**
   * Create a 1D axis config from two value binding configs
   * @param negative - Config for negative direction
   * @param positive - Config for positive direction
   */
  axis1D(
    negative: ValueBindingConfig<number>,
    positive: ValueBindingConfig<number>
  ): CompositeAxis1DConfig {
    return { type: "compositeAxis1D", negative, positive };
  },

  /**
   * Create a Vector2 config from four value binding configs
   * @param up - Config for up/positive Y
   * @param down - Config for down/negative Y
   * @param left - Config for left/negative X
   * @param right - Config for right/positive X
   */
  vector2(
    up: ValueBindingConfig<number>,
    down: ValueBindingConfig<number>,
    left: ValueBindingConfig<number>,
    right: ValueBindingConfig<number>
  ): CompositeVector2Config {
    return { type: "compositeVector2", up, down, left, right };
  },

  /**
   * Create a button OR config from multiple button binding configs
   * @param bindings - Button binding configs where any pressed child activates the composite
   */
  any(...bindings: ButtonBindingConfig[]): CompositeButtonAnyConfig {
    return { type: "compositeButtonAny", bindings };
  },

  /**
   * Create a button AND config from multiple button binding configs
   * @param bindings - Button binding configs where all pressed children activate the composite
   */
  all(...bindings: ButtonBindingConfig[]): CompositeButtonAllConfig {
    return { type: "compositeButtonAll", bindings };
  },
};

export function withProcessors(
  binding: ValueBindingConfig<number>,
  ...processors: ScalarProcessorConfig[]
): ValueBindingConfig<number>;
export function withProcessors(
  binding: ValueBindingConfig<Vector2>,
  ...processors: Vector2ProcessorConfig[]
): ValueBindingConfig<Vector2>;
export function withProcessors(
  binding: ValueBindingConfig<number> | ValueBindingConfig<Vector2>,
  ...processors: ScalarProcessorConfig[] | Vector2ProcessorConfig[]
): BindingConfig {
  return {
    ...binding,
    processors,
  } as BindingConfig;
}

// ============================================================================
// Create Binding from Config
// ============================================================================

/**
 * Creates a binding instance from a config object.
 * This factory instantiates stateful binding objects from pure config data.
 *
 * @param config - The binding config (pure data)
 * @returns A binding instance with internal state
 */
export function createBindingFromConfig(config: BindingConfig): Binding {
  switch (config.type) {
    case "keyAxis":
      return withNumberProcessors(createKeyAxisBinding(config.code), config.processors);
    case "keyButton":
      return createKeyButtonBinding(config.code);
    case "gamepadButton":
      return createGamepadButtonBinding(config.button);
    case "gamepadAxis":
      return withNumberProcessors(
        createGamepadAxisBinding(config.axis, config.invert),
        config.processors,
      );
    case "gamepadStick":
      return withVector2Processors(
        createGamepadStickBinding(config.stick, config.deadzone),
        config.processors,
      );
    case "dpad":
      return withVector2Processors(createDPadBinding(), config.processors);
    case "mouseButton":
      return createMouseButtonBinding(config.button);
    case "mouseDelta":
      return withVector2Processors(
        createMouseDeltaBinding(config.requirePointerLock),
        config.processors,
      );
    case "mouseWheel":
      return withNumberProcessors(createMouseWheelBinding(), config.processors);
    case "touchTap":
      return createTouchTapBinding();
    case "customButton":
      return createCustomButtonBinding(config.event);
    case "customValue":
      return withNumberProcessors(
        createCustomValueBinding(config.event),
        config.processors,
      );
    case "customVector2":
      return withVector2Processors(
        createCustomVector2Binding(config.event),
        config.processors,
      );
    case "touchJoystick":
      return withNumberProcessors(
        createTouchJoystickBinding(config.axis),
        config.processors,
      );
    case "touchJoystickVector2":
      return withVector2Processors(
        createTouchJoystickVector2Binding(),
        config.processors,
      );
    case "touchPosition":
      return withVector2Processors(createTouchPositionBinding(), config.processors);
    case "touchDelta":
      return withVector2Processors(
        createTouchDeltaBinding(),
        config.processors,
      );
    case "compositeAxis1D":
      return withNumberProcessors(
        createCompositeAxis1DBinding(
          createBindingFromConfig(config.negative) as ValueBinding<number>,
          createBindingFromConfig(config.positive) as ValueBinding<number>,
        ),
        config.processors,
      );
    case "compositeVector2":
      return withVector2Processors(
        createCompositeVector2Binding(
          createBindingFromConfig(config.up) as ValueBinding<number>,
          createBindingFromConfig(config.down) as ValueBinding<number>,
          createBindingFromConfig(config.left) as ValueBinding<number>,
          createBindingFromConfig(config.right) as ValueBinding<number>,
        ),
        config.processors,
      );
    case "compositeButtonAny":
      return createCompositeButtonBinding(
        config.type,
        config.bindings.map(
          (binding) => createBindingFromConfig(binding) as ButtonBinding
        )
      );
    case "compositeButtonAll":
      return createCompositeButtonBinding(
        config.type,
        config.bindings.map(
          (binding) => createBindingFromConfig(binding) as ButtonBinding
        )
      );
  }
}

/**
 * Utility to combine multiple bindings into a single value.
 * We implement binding combination in binding layer because bindings
 * know the semantics of their values. One assumption is that different
 * bindings should agree on combination logic (eg mouse delta and gamepad axis)
 */
const combineBinding = {
  number: {
    first: (bindings: ValueBinding<number>[]) => {
      for (const binding of bindings) {
        const value = binding.read();
        if (value !== 0) {
          return value;
        }
      }
      return 0;
    },
    sum: (bindings: ValueBinding<number>[]) => {
      let sum = 0;
      for (const binding of bindings) {
        sum += binding.read();
      }
      return sum;
    },
  },
  vector2: {
    first: (bindings: ValueBinding<Vector2>[]) => {
      let x = 0;
      let y = 0;
      for (const binding of bindings) {
        const value = binding.read();
        if (value.x !== 0 && x === 0) {
          x = value.x;
        }
        if (value.y !== 0 && y === 0) {
          y = value.y;
        }
      }
      return { x, y };
    },
    sum: (bindings: ValueBinding<Vector2>[]) => {
      let x = 0;
      let y = 0;
      for (const binding of bindings) {
        const value = binding.read();
        x += value.x;
        y += value.y;
      }
      return { x, y };
    },
  },
};
