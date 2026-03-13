import {
  type Collider,
  createInputs,
  Gamepad,
  Interactions,
  Keyboard,
  type RaycastResult,
  type RigidBody,
} from "../../src";

createInputs({
  move: {
    type: "vector2",
    bindings: [Keyboard.wasd(), Gamepad.leftStick()],
  },
  jump: {
    type: "button",
    bindings: [Keyboard.button("Space"), Gamepad.button("A")],
    interactions: [Interactions.press()],
  },
});

declare const rigidBody: RigidBody;
declare const collider: Collider;
declare const raycastResult: RaycastResult;

rigidBody.setLinearDamping(1.5);
rigidBody.setAngularDamping(2);
rigidBody.raw.setLinearDamping(1.5);
rigidBody.raw.setAngularDamping(2);
collider.raw.isSensor();
raycastResult.raw.toi;
