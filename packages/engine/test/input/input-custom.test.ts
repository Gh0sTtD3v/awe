import { createInputs } from "../../src/input/input-map";
import { Custom, Keyboard } from "../../src/input/bindings";
import { sharedControlState } from "../../src/input/control-state";
import {
  emitInputFrame,
  pressCustomButton,
  pressKey,
  releaseCustomButton,
  releaseKey,
  setupNavigatorMock,
} from "./input-test-utils";

describe("Inputs custom bindings", () => {
  beforeAll(() => {
    setupNavigatorMock();
  });

  beforeEach(() => {
    sharedControlState.reset();
  });

  afterEach(() => {
    sharedControlState.reset();
  });

  it("should trigger button actions from imperative custom buttons", () => {
    const inputs = createInputs({
      Jump: {
        type: "button",
        bindings: [Custom.button("jump")],
      },
    } as const);

    let performedCount = 0;
    const unsubscribe = inputs.Jump.onPerformed(() => {
      performedCount++;
    });

    try {
      pressCustomButton("jump");
      emitInputFrame();
      inputs.update(1 / 60);

      expect(inputs.Jump.isPressed).toBe(true);
      expect(inputs.Jump.wasJustPressed).toBe(true);
      expect(performedCount).toBe(1);

      releaseCustomButton("jump");
      emitInputFrame();
      inputs.update(1 / 60);

      expect(inputs.Jump.isPressed).toBe(false);
      expect(inputs.Jump.wasJustReleased).toBe(true);
    } finally {
      unsubscribe();
      inputs.dispose();
    }
  });

  it("should compose custom bindings with hardware bindings", () => {
    const inputs = createInputs({
      Jump: {
        type: "button",
        bindings: [Custom.button("jump"), Keyboard.button("Space")],
      },
    } as const);

    try {
      pressCustomButton("jump");
      emitInputFrame();
      inputs.update(1 / 60);
      expect(inputs.Jump.isPressed).toBe(true);

      releaseCustomButton("jump");
      pressKey("Space");
      emitInputFrame();
      inputs.update(1 / 60);
      expect(inputs.Jump.isPressed).toBe(true);

      releaseKey("Space");
      emitInputFrame();
      inputs.update(1 / 60);
      expect(inputs.Jump.isPressed).toBe(false);
    } finally {
      inputs.dispose();
    }
  });
});
