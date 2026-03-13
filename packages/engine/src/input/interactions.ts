/**
 * Interactions define complex input behaviors beyond simple press/release.
 *
 * Only applicable to "button" type actions (InputAction).
 * Each interaction processes button state and returns phases that trigger callbacks.
 *
 * Built-in interactions:
 * - Press: Fires on button down, up, or both
 * - Hold: Fires after holding for a duration
 * - Tap: Fires on quick press and release
 * - MultiTap: Fires after N consecutive quick taps
 *
 * @module interactions
 */

/**
 * Interaction phases - represents the lifecycle stage of an interaction.
 * - "waiting": Interaction not active
 * - "started": Interaction has begun (e.g., button pressed)
 * - "performed": Interaction completed successfully
 * - "canceled": Interaction was interrupted (e.g., released too early for hold)
 */
export type InteractionPhase = "waiting" | "started" | "performed" | "canceled";

/**
 * Interaction state passed to callbacks
 */
export interface InteractionContext {
  /** Current phase of the interaction */
  phase: InteractionPhase;
  /** Time since the interaction started (seconds) */
  duration: number;
  /** Time since last frame (seconds) */
  deltaTime: number;
  /** Current value being tracked (for button interactions, 0 or 1) */
  value: number;
  /** Whether the button is currently pressed */
  isPressed: boolean;
  /** Whether the button was just pressed this frame */
  wasJustPressed: boolean;
  /** Whether the button was just released this frame */
  wasJustReleased: boolean;
}

/**
 * Base interaction interface
 */
export interface Interaction {
  /** Interaction type identifier */
  type: string;
  /** Reset the interaction state */
  reset(): void;
  /**
   * Process the interaction and return the current phase.
   * Returns the phase that should trigger callbacks this frame, or null if no callback should fire.
   */
  process(ctx: InteractionContext): InteractionPhase | null;
}

/**
 * Press interaction configuration
 */
export interface PressConfig {
  type: "press";
  /**
   * Press behavior:
   * - "pressOnly": Fires only on press down (default)
   * - "releaseOnly": Fires only on release
   * - "pressAndRelease": Fires on both press and release
   */
  behavior?: "pressOnly" | "releaseOnly" | "pressAndRelease";
}

/**
 * Hold interaction configuration
 */
export interface HoldConfig {
  type: "hold";
  /** Duration to hold before firing (seconds, default: 0.4) */
  duration?: number;
}

/**
 * Tap interaction configuration
 */
export interface TapConfig {
  type: "tap";
  /** Maximum duration for a tap (seconds, default: 0.2) */
  maxDuration?: number;
}

/**
 * Multi-tap interaction configuration
 */
export interface MultiTapConfig {
  type: "multiTap";
  /** Number of taps required (default: 2) */
  tapCount?: number;
  /** Maximum time between taps (seconds, default: 0.4) */
  tapSpacing?: number;
  /** Maximum duration for each tap (seconds, default: 0.2) */
  maxTapDuration?: number;
}

export type InteractionConfig =
  | PressConfig
  | HoldConfig
  | TapConfig
  | MultiTapConfig;

// ---- Interaction Implementations ----

/**
 * Press interaction - fires when button is pressed or released
 */
export class PressInteraction implements Interaction {
  type = "press" as const;
  private _behavior: "pressOnly" | "releaseOnly" | "pressAndRelease";
  private _wasPerformed = false;

  constructor(config: PressConfig = { type: "press" }) {
    this._behavior = config.behavior ?? "pressOnly";
  }

  reset(): void {
    this._wasPerformed = false;
  }

  process(ctx: InteractionContext): InteractionPhase | null {
    switch (this._behavior) {
      case "pressOnly":
        if (ctx.wasJustPressed) {
          return "performed";
        }
        break;
      case "releaseOnly":
        if (ctx.wasJustReleased) {
          return "performed";
        }
        break;
      case "pressAndRelease":
        if (ctx.wasJustPressed) {
          this._wasPerformed = true;
          return "started";
        }
        if (ctx.wasJustReleased && this._wasPerformed) {
          this._wasPerformed = false;
          return "performed";
        }
        break;
    }
    return null;
  }
}

/**
 * Hold interaction - fires after button is held for a duration
 */
export class HoldInteraction implements Interaction {
  type = "hold" as const;
  private _duration: number;
  private _holdTime = 0;
  private _started = false;
  private _performed = false;

  constructor(config: HoldConfig = { type: "hold" }) {
    this._duration = config.duration ?? 0.4;
  }

  reset(): void {
    this._holdTime = 0;
    this._started = false;
    this._performed = false;
  }

  process(ctx: InteractionContext): InteractionPhase | null {
    if (ctx.wasJustPressed) {
      this._holdTime = 0;
      this._started = true;
      this._performed = false;
      return "started";
    }

    if (this._started && ctx.isPressed) {
      this._holdTime += ctx.deltaTime;
      if (!this._performed && this._holdTime + 1e-9 >= this._duration) {
        this._performed = true;
        return "performed";
      }
    }

    if (ctx.wasJustReleased) {
      const wasStarted = this._started;
      this.reset();
      if (wasStarted) {
        return "canceled";
      }
    }

    return null;
  }
}

/**
 * Tap interaction - fires on quick press and release
 */
export class TapInteraction implements Interaction {
  type = "tap" as const;
  private _maxDuration: number;
  private _pressTime = 0;
  private _started = false;

  constructor(config: TapConfig = { type: "tap" }) {
    this._maxDuration = config.maxDuration ?? 0.2;
  }

  reset(): void {
    this._pressTime = 0;
    this._started = false;
  }

  process(ctx: InteractionContext): InteractionPhase | null {
    if (ctx.wasJustPressed) {
      this._pressTime = 0;
      this._started = true;
      return "started";
    }

    if (this._started && ctx.isPressed) {
      this._pressTime += ctx.deltaTime;
      // If held too long, cancel
      if (this._pressTime > this._maxDuration) {
        this._started = false;
        return "canceled";
      }
    }

    if (ctx.wasJustReleased && this._started) {
      this._started = false;
      if (this._pressTime <= this._maxDuration) {
        return "performed";
      }
      return "canceled";
    }

    return null;
  }
}

/**
 * Multi-tap interaction - fires after N quick taps
 */
export class MultiTapInteraction implements Interaction {
  type = "multiTap" as const;
  private _tapCount: number;
  private _tapSpacing: number;
  private _maxTapDuration: number;
  private _currentTaps = 0;
  private _lastTapTime = 0;
  private _currentPressTime = 0;
  private _isPressed = false;
  private _timeSinceLastTap = 0;

  constructor(config: MultiTapConfig = { type: "multiTap" }) {
    this._tapCount = config.tapCount ?? 2;
    this._tapSpacing = config.tapSpacing ?? 0.4;
    this._maxTapDuration = config.maxTapDuration ?? 0.2;
  }

  reset(): void {
    this._currentTaps = 0;
    this._lastTapTime = 0;
    this._currentPressTime = 0;
    this._isPressed = false;
    this._timeSinceLastTap = 0;
  }

  process(ctx: InteractionContext): InteractionPhase | null {
    // Track time since last tap
    if (this._currentTaps > 0) {
      this._timeSinceLastTap += ctx.deltaTime;

      // Reset if too much time between taps
      if (!ctx.isPressed && this._timeSinceLastTap > this._tapSpacing) {
        this.reset();
        return "canceled";
      }
    }

    if (ctx.wasJustPressed) {
      this._currentPressTime = 0;
      this._isPressed = true;

      // Check if this press is within the tap spacing window
      if (this._currentTaps > 0 && this._timeSinceLastTap > this._tapSpacing) {
        this.reset();
        this._isPressed = true;
      }

      return this._currentTaps === 0 ? "started" : null;
    }

    if (this._isPressed && ctx.isPressed) {
      this._currentPressTime += ctx.deltaTime;

      // If held too long, not a tap
      if (this._currentPressTime > this._maxTapDuration) {
        this.reset();
        return "canceled";
      }
    }

    if (ctx.wasJustReleased && this._isPressed) {
      this._isPressed = false;

      // Valid tap?
      if (this._currentPressTime <= this._maxTapDuration) {
        this._currentTaps++;
        this._timeSinceLastTap = 0;

        if (this._currentTaps >= this._tapCount) {
          this.reset();
          return "performed";
        }
      } else {
        this.reset();
        return "canceled";
      }
    }

    return null;
  }
}

// ---- Factory ----

/**
 * Create an interaction from a configuration object.
 * @internal
 */
export function createInteraction(config: InteractionConfig): Interaction {
  switch (config.type) {
    case "press":
      return new PressInteraction(config);
    case "hold":
      return new HoldInteraction(config);
    case "tap":
      return new TapInteraction(config);
    case "multiTap":
      return new MultiTapInteraction(config);
    default:
      // Default to press
      return new PressInteraction({ type: "press" });
  }
}

/**
 * Builder utility for creating interaction configs.
 * Interactions define complex input behaviors beyond simple press/release.
 * Only applicable to "button" type actions.
 *
 * @example
 * ```ts
 * {
 *   Jump: {
 *     type: "button",
 *     bindings: [Bindings.keyButton("Space")],
 *     interactions: [Interactions.press()],  // Default
 *   },
 *   ChargeAttack: {
 *     type: "button",
 *     bindings: [Bindings.keyButton("KeyE")],
 *     interactions: [Interactions.hold(0.5)],  // Hold for 0.5s
 *   },
 *   Dodge: {
 *     type: "button",
 *     bindings: [Bindings.keyButton("ShiftLeft")],
 *     interactions: [Interactions.tap(0.2)],  // Quick tap
 *   },
 *   DoubleJump: {
 *     type: "button",
 *     bindings: [Bindings.keyButton("Space")],
 *     interactions: [Interactions.multiTap(2, 0.4)],  // Double-tap
 *   },
 * }
 * ```
 */
export const Interactions = {
  /**
   * Create a press interaction.
   * @param behavior - When to fire:
   *   - "pressOnly" (default): Fires when button is pressed down
   *   - "releaseOnly": Fires when button is released
   *   - "pressAndRelease": started on press, performed on release
   */
  press(behavior?: "pressOnly" | "releaseOnly" | "pressAndRelease"): PressConfig {
    return { type: "press", behavior };
  },

  /**
   * Create a hold interaction.
   * Fires after button is held for the specified duration.
   * Phases: started (on press) → performed (after duration) → canceled (if released early)
   * @param duration - Seconds to hold before firing (default: 0.4)
   */
  hold(duration?: number): HoldConfig {
    return { type: "hold", duration };
  },

  /**
   * Create a tap interaction.
   * Fires on quick press and release within the time limit.
   * Phases: started (on press) → performed (if released in time) → canceled (if held too long)
   * @param maxDuration - Max seconds for tap (default: 0.2)
   */
  tap(maxDuration?: number): TapConfig {
    return { type: "tap", maxDuration };
  },

  /**
   * Create a multi-tap interaction (e.g., double-tap, triple-tap).
   * Fires after N quick consecutive taps.
   * Phases: started (first tap) → performed (after N taps) → canceled (if timing fails)
   * @param tapCount - Number of taps required (default: 2)
   * @param tapSpacing - Max seconds between taps (default: 0.4)
   * @param maxTapDuration - Max seconds for each tap (default: 0.2)
   */
  multiTap(tapCount?: number, tapSpacing?: number, maxTapDuration?: number): MultiTapConfig {
    return { type: "multiTap", tapCount, tapSpacing, maxTapDuration };
  },
};
