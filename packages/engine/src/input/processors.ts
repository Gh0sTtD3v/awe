/**
 * Value processors for transforming input values.
 *
 * Processors are applied in order to transform raw input values.
 * Use on InputValue actions (value, vector2, delta, vector2_delta types).
 *
 * Common use cases:
 * - Deadzone: Filter out small stick drift
 * - Scale: Adjust sensitivity
 * - Curve: Non-linear response for smoother/snappier feel
 * - Clamp: Limit maximum values
 *
 * @module processors
 */

import type { Vector2 } from "./bindings";

/**
 * Processor function type for transforming input values.
 * Takes a value and returns a transformed value of the same type.
 */
export type Processor<T> = (value: T) => T;

// ============================================================================
// Processor Config Types - Pure data, no functions
// ============================================================================

/** Config for deadzone processor (scalar) */
export interface DeadzoneConfig {
  type: "deadzone";
  threshold?: number;
}

/** Config for invert processor (scalar) */
export interface InvertConfig {
  type: "invert";
}

/** Config for scale processor (scalar) */
export interface ScaleConfig {
  type: "scale";
  factor: number;
}

/** Config for clamp processor (scalar) */
export interface ClampConfig {
  type: "clamp";
  min: number;
  max: number;
}

/** Config for normalize processor (scalar) */
export interface NormalizeConfig {
  type: "normalize";
}

/** Config for curve processor (scalar) */
export interface CurveConfig {
  type: "curve";
  exponent: number;
}

/** Config for snapToZero processor (scalar) */
export interface SnapToZeroConfig {
  type: "snapToZero";
  threshold: number;
}

/** Config for deadzoneVector2 processor */
export interface DeadzoneVector2Config {
  type: "deadzoneVector2";
  threshold?: number;
}

/** Config for invertVector2 processor */
export interface InvertVector2Config {
  type: "invertVector2";
  invertX?: boolean;
  invertY?: boolean;
}

/** Config for scaleVector2 processor */
export interface ScaleVector2Config {
  type: "scaleVector2";
  factorX: number;
  factorY?: number;
}

/** Config for clampMagnitude processor */
export interface ClampMagnitudeConfig {
  type: "clampMagnitude";
  max: number;
}

/** Config for normalizeVector2 processor */
export interface NormalizeVector2Config {
  type: "normalizeVector2";
}

/** Config for swapAxes processor */
export interface SwapAxesConfig {
  type: "swapAxes";
}

/** Config for axialDeadzone processor */
export interface AxialDeadzoneConfig {
  type: "axialDeadzone";
  thresholdX?: number;
  thresholdY?: number;
}

/** Union of all scalar processor configs */
export type ScalarProcessorConfig =
  | DeadzoneConfig
  | InvertConfig
  | ScaleConfig
  | ClampConfig
  | NormalizeConfig
  | CurveConfig
  | SnapToZeroConfig;

/** Union of all Vector2 processor configs */
export type Vector2ProcessorConfig =
  | DeadzoneVector2Config
  | InvertVector2Config
  | ScaleVector2Config
  | ClampMagnitudeConfig
  | NormalizeVector2Config
  | SwapAxesConfig
  | AxialDeadzoneConfig;

/** Union of all processor configs */
export type ProcessorConfig = ScalarProcessorConfig | Vector2ProcessorConfig;

// ============================================================================
// Scalar Processor Implementations
// ============================================================================

/**
 * Apply deadzone to a scalar value.
 * Values below the threshold are set to 0.
 */
export function deadzone(threshold = 0.15): DeadzoneConfig {
  return { type: "deadzone", threshold };
}

/**
 * Invert a scalar value
 */
export function invert(): InvertConfig {
  return { type: "invert" };
}

/**
 * Scale a scalar value by a factor
 */
export function scale(factor: number): ScaleConfig {
  return { type: "scale", factor };
}

/**
 * Clamp a scalar value to a range
 */
export function clamp(min: number, max: number): ClampConfig {
  return { type: "clamp", min, max };
}

/**
 * Normalize a scalar value to -1, 0, or 1
 */
export function normalize(): NormalizeConfig {
  return { type: "normalize" };
}

/**
 * Apply an exponent curve to make input feel more responsive or smoother.
 * Values > 1 make small inputs less sensitive (smoother).
 * Values < 1 make small inputs more sensitive (snappier).
 */
export function curve(exponent: number): CurveConfig {
  return { type: "curve", exponent };
}

/**
 * Snap to zero if below threshold (simpler than deadzone, no rescaling)
 */
export function snapToZero(threshold: number): SnapToZeroConfig {
  return { type: "snapToZero", threshold };
}

// ---- Vector2 Processors ----

/**
 * Apply deadzone to a Vector2 value (radial deadzone)
 */
export function deadzoneVector2(threshold = 0.15): DeadzoneVector2Config {
  return { type: "deadzoneVector2", threshold };
}

/**
 * Invert X and/or Y axis of a Vector2
 */
export function invertVector2(
  invertX = false,
  invertY = false
): InvertVector2Config {
  return { type: "invertVector2", invertX, invertY };
}

/**
 * Scale a Vector2 value
 */
export function scaleVector2(factorX: number, factorY = factorX): ScaleVector2Config {
  return { type: "scaleVector2", factorX, factorY };
}

/**
 * Clamp Vector2 magnitude to a maximum
 */
export function clampMagnitude(max: number): ClampMagnitudeConfig {
  return { type: "clampMagnitude", max };
}

/**
 * Normalize Vector2 to unit length or zero
 */
export function normalizeVector2(): NormalizeVector2Config {
  return { type: "normalizeVector2" };
}

/**
 * Swap X and Y axes
 */
export function swapAxes(): SwapAxesConfig {
  return { type: "swapAxes" };
}

/**
 * Apply per-axis deadzone (axial deadzone)
 */
export function axialDeadzone(thresholdX = 0.15, thresholdY = 0.15): AxialDeadzoneConfig {
  return { type: "axialDeadzone", thresholdX, thresholdY };
}

// ============================================================================
// Processor Factory Functions
// ============================================================================

/**
 * Create a scalar processor function from a config object.
 */
export function createProcessor(config: ScalarProcessorConfig): Processor<number> {
  switch (config.type) {
    case "deadzone": {
      const threshold = config.threshold ?? 0.15;
      return (value: number) => {
        if (Math.abs(value) < threshold) return 0;
        const sign = Math.sign(value);
        const magnitude = Math.abs(value);
        return sign * ((magnitude - threshold) / (1 - threshold));
      };
    }
    case "invert":
      return (value: number) => -value;
    case "scale":
      return (value: number) => value * config.factor;
    case "clamp":
      return (value: number) => Math.max(config.min, Math.min(config.max, value));
    case "normalize":
      return (value: number) => {
        if (value > 0) return 1;
        if (value < 0) return -1;
        return 0;
      };
    case "curve":
      return (value: number) => {
        const sign = Math.sign(value);
        const magnitude = Math.abs(value);
        return sign * Math.pow(magnitude, config.exponent);
      };
    case "snapToZero":
      return (value: number) => (Math.abs(value) < config.threshold ? 0 : value);
  }
}

/**
 * Create a Vector2 processor function from a config object.
 */
export function createVector2Processor(
  config: Vector2ProcessorConfig
): Processor<Vector2> {
  switch (config.type) {
    case "deadzoneVector2": {
      const threshold = config.threshold ?? 0.15;
      return (value: Vector2) => {
        const magnitude = Math.sqrt(value.x * value.x + value.y * value.y);
        if (magnitude < threshold) return { x: 0, y: 0 };
        const scale = (magnitude - threshold) / (1 - threshold) / magnitude;
        return { x: value.x * scale, y: value.y * scale };
      };
    }
    case "invertVector2": {
      const invertX = config.invertX ?? false;
      const invertY = config.invertY ?? false;
      return (value: Vector2) => ({
        x: invertX ? -value.x : value.x,
        y: invertY ? -value.y : value.y,
      });
    }
    case "scaleVector2": {
      const factorX = config.factorX;
      const factorY = config.factorY ?? factorX;
      return (value: Vector2) => ({
        x: value.x * factorX,
        y: value.y * factorY,
      });
    }
    case "clampMagnitude":
      return (value: Vector2) => {
        const magnitude = Math.sqrt(value.x * value.x + value.y * value.y);
        if (magnitude <= config.max) return value;
        const scale = config.max / magnitude;
        return { x: value.x * scale, y: value.y * scale };
      };
    case "normalizeVector2":
      return (value: Vector2) => {
        const magnitude = Math.sqrt(value.x * value.x + value.y * value.y);
        if (magnitude === 0) return { x: 0, y: 0 };
        return { x: value.x / magnitude, y: value.y / magnitude };
      };
    case "swapAxes":
      return (value: Vector2) => ({ x: value.y, y: value.x });
    case "axialDeadzone": {
      const thresholdX = config.thresholdX ?? 0.15;
      const thresholdY = config.thresholdY ?? 0.15;
      const deadzoneX = createProcessor({ type: "deadzone", threshold: thresholdX });
      const deadzoneY = createProcessor({ type: "deadzone", threshold: thresholdY });
      return (value: Vector2) => ({
        x: deadzoneX(value.x),
        y: deadzoneY(value.y),
      });
    }
  }
}

/**
 * Create a processor function from any processor config.
 * Automatically determines if it's a scalar or Vector2 processor.
 */
export function createProcessorFromConfig(
  config: ProcessorConfig
): Processor<number> | Processor<Vector2> {
  if (
    config.type === "deadzoneVector2" ||
    config.type === "invertVector2" ||
    config.type === "scaleVector2" ||
    config.type === "clampMagnitude" ||
    config.type === "normalizeVector2" ||
    config.type === "swapAxes" ||
    config.type === "axialDeadzone"
  ) {
    return createVector2Processor(config as Vector2ProcessorConfig);
  }
  return createProcessor(config as ScalarProcessorConfig);
}

// ---- Processor Pipeline ----

/**
 * Compose multiple processor configs into a single processor function
 */
export function compose<T extends number | Vector2>(
  ...configs: ProcessorConfig[]
): Processor<T> {
  const processors = configs.map((c) => createProcessorFromConfig(c));
  return (value: T) => processors.reduce((v, p) => (p as Processor<T>)(v), value);
}

// ============================================================================
// Processors Namespace
// ============================================================================

/**
 * Builder utility for creating value processors.
 * Processors transform input values (e.g., apply deadzone, scale, clamp).
 *
 * @example
 * ```ts
 * {
 *   Move: {
 *     type: "vector2",
 *     bindings: [Bindings.leftStick()],
 *     processors: [
 *       Processors.deadzoneVector2(0.15),
 *       Processors.scaleVector2(2.0),
 *       Processors.clampMagnitude(1.0),
 *     ],
 *   },
 * }
 *
 * // Compose multiple processors
 * const myProcessor = Processors.compose(
 *   Processors.deadzoneVector2(0.15),
 *   Processors.scaleVector2(2.0),
 * );
 * ```
 */
export const Processors = {
  // Scalar processors
  deadzone,
  invert,
  scale,
  clamp,
  normalize,
  curve,
  snapToZero,
  // Vector2 processors
  deadzoneVector2,
  invertVector2,
  scaleVector2,
  clampMagnitude,
  normalizeVector2,
  swapAxes,
  axialDeadzone,
  // Pipeline utilities
  compose,
  createProcessor,
  createVector2Processor,
  createProcessorFromConfig,
};

