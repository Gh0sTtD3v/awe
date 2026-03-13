/**
 * TypeScript utility types for type-safe input configuration
 */

import type {
  ButtonBindingConfig,
  ValueBindingConfig,
  Vector2,
} from "./bindings";
import type { InteractionConfig } from "./interactions";
import type {
  ScalarProcessorConfig,
  Vector2ProcessorConfig,
} from "./processors";

// ---- Input Type ----

/** String literals for continuous value input types in user config */
export type InputValueKind = "value" | "vector2";
/** String literals for button action type in user config */
export type ActionType = "button";
/** All valid input type strings for user config */
export type InputType = InputValueKind | ActionType;

/** Internal value type strings used by InputValueConfig */
export type ValueType = "number" | "vector2";
/** Runtime value data types */
export type ValueDataType = number | Vector2;

// ---- Input Type to Value Type Mapping ----

/**
 * Maps input type strings to their runtime value types
 */
export type InputTypeToValueType = {
  button: number;
  value: number;
  vector2: Vector2;
};

// ---- Typed Input Config ----

/**
 * Configuration for a single input (action or value).
 * Used in the config object passed to createInputs().
 */
export interface ButtonInputConfig {
  /** Input type: "button" for discrete actions */
  type: "button";
  /** Button bindings only */
  bindings: readonly ButtonBindingConfig[];
  /** Interactions to process */
  interactions?: readonly InteractionConfig[];
  /** Scalar processors applied to the button value (0 or 1) */
  processors?: readonly ScalarProcessorConfig[];
}

export interface ValueInputConfig {
  /** Input type: "value" for continuous scalar inputs */
  type: "value";
  /** Scalar value bindings only */
  bindings: readonly ValueBindingConfig<number>[];
  /** Scalar processors applied to the input value */
  processors?: readonly ScalarProcessorConfig[];
  /** Interactions are only supported for button inputs */
  interactions?: never;
}

export interface Vector2InputConfig {
  /** Input type: "vector2" for continuous Vector2 inputs */
  type: "vector2";
  /** Vector2 bindings only */
  bindings: readonly ValueBindingConfig<Vector2>[];
  /** Vector2 processors applied to the input value */
  processors?: readonly Vector2ProcessorConfig[];
  /** Interactions are only supported for button inputs */
  interactions?: never;
}

export type InputConfigByType = {
  button: ButtonInputConfig;
  value: ValueInputConfig;
  vector2: Vector2InputConfig;
};

export type TypedInputConfig<T extends InputType = InputType> =
  InputConfigByType[T];

/**
 * A map of input names to their configs.
 * Used as the config type for createInputs().
 */
export type TypedActionsConfig = {
  readonly [inputName: string]: TypedInputConfig;
};
