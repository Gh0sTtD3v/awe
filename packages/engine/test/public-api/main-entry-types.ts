import {
  type AvatarComponent,
  type Collider,
  createInputs,
  Gamepad,
  Interactions,
  Keyboard,
  type RaycastResult,
  type RigidBody,
  type Space,
  type SpaceScheduleHandle,
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
declare const space: Space;

const player = space.components.byId<AvatarComponent>("player");
const handle: SpaceScheduleHandle = space.schedule(1.5, () => {});

rigidBody.setLinearDamping(1.5);
rigidBody.setAngularDamping(2);
rigidBody.raw.setLinearDamping(1.5);
rigidBody.raw.setAngularDamping(2);
collider.raw.isSensor();
raycastResult.raw.toi;
player?.play("idle");
handle.cancel();
handle.active;
