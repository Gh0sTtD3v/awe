import type { Vector2 } from "./bindings";
import { InputAction } from "./input-action";
import type { Inputs } from "./input-map";
import { InputValue } from "./input-value";
import type { TypedActionsConfig, TypedInputConfig } from "./types";

export interface ButtonInputSnapshot {
  pressed: boolean;
  justPressed: boolean;
  justReleased: boolean;
  value: number;
}

type InputSnapshotValue<TConfig extends TypedInputConfig> =
  TConfig["type"] extends "button"
    ? ButtonInputSnapshot
    : TConfig["type"] extends "vector2"
      ? Vector2
      : number;

export type InputSnapshot<TConfig extends TypedActionsConfig> = {
  readonly [K in keyof TConfig]: InputSnapshotValue<TConfig[K]>;
};

function toButtonInputSnapshot(input: InputAction): ButtonInputSnapshot {
  return {
    pressed: input.isPressed,
    justPressed: input.wasJustPressed,
    justReleased: input.wasJustReleased,
    value: input.value,
  };
}

/**
 * Capture the current typed gameplay-relevant input state as a plain object.
 *
 * This gives higher-level control code a command-friendly snapshot without
 * coupling it to polling and callback APIs.
 */
export function readInputsSnapshot<TConfig extends TypedActionsConfig>(
  inputs: Inputs<TConfig>,
): InputSnapshot<TConfig> {
  const snapshot: Record<string, unknown> = {};

  for (const [name, input] of Object.entries(inputs)) {
    if (input instanceof InputAction) {
      snapshot[name] = toButtonInputSnapshot(input);
      continue;
    }

    if (input instanceof InputValue) {
      snapshot[name] = input.readValue();
    }
  }

  return snapshot as InputSnapshot<TConfig>;
}

