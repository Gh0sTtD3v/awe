import {
  createInputs,
  Interactions,
  Keyboard,
  Mouse,
  Processors,
  TypedInputConfig,
} from "../../src/input";

createInputs({
  look: {
    type: "vector2",
    bindings: [Mouse.delta()],
    processors: [Processors.normalizeVector2()],
  },
  jump: {
    type: "button",
    bindings: [Keyboard.button("Space")],
    interactions: [Interactions.tap()],
    processors: [Processors.scale(1)],
  },
});

const invalidButtonBinding: TypedInputConfig<"button"> = {
  type: "button",
  bindings: [
    // @ts-expect-error vector2 bindings should not be accepted by button inputs
    Mouse.delta(),
  ],
};

const invalidVector2Binding: TypedInputConfig<"vector2"> = {
  type: "vector2",
  bindings: [
    // @ts-expect-error button bindings should not be accepted by vector2 inputs
    Keyboard.button("Space"),
  ],
};

const invalidVector2Interaction: TypedInputConfig<"vector2"> = {
  type: "vector2",
  bindings: [Mouse.delta()],
  // @ts-expect-error interactions are only supported for button inputs
  interactions: [Interactions.tap()],
};

const invalidButtonProcessor: TypedInputConfig<"button"> = {
  type: "button",
  bindings: [Keyboard.button("Space")],
  processors: [
    // @ts-expect-error vector2 processors should not be accepted by button inputs
    Processors.normalizeVector2(),
  ],
};

void invalidButtonBinding;
void invalidVector2Binding;
void invalidVector2Interaction;
void invalidButtonProcessor;
