import { Quaternion, Vector3 } from "three";
import { Mover } from "../../src/controls/mover";

function createMoverHarness() {
  const characterController = {
    update: vi.fn((body: any, velocity: Vector3) => {
      body.rigidBody.position = body.position.clone().add(velocity);
      return { onFloor: true, collidesWith: [] };
    }),
  };

  const body = {
    componentType: "avatar",
    position: new Vector3(0, 0, 0),
    quaternion: new Quaternion(),
    space: {
      physics: {
        createCharacterController: vi.fn(() => characterController),
      },
    },
    rigidBody: {
      teleport: vi.fn((position: Vector3, quaternion: Quaternion) => {
        body.position.copy(position);
        body.quaternion.copy(quaternion);
      }),
      get position() {
        return body.position;
      },
      set position(position: Vector3) {
        body.position.copy(position);
      },
      translationLock: [false, false, false] as [boolean, boolean, boolean],
    },
    getWorldDirection: vi.fn((target: Vector3) => target.set(0, 0, -1)),
    updateMatrixWorld: vi.fn(),
  };

  const mover = new Mover({ body: body as any });

  return { mover, body, characterController };
}

describe("Mover", () => {
  it("reset ground sync probes grounded state without shifting the body", () => {
    const { mover, body, characterController } = createMoverHarness();

    mover.reset();
    mover.update(1 / 60);

    expect(characterController.update).toHaveBeenCalledTimes(1);
    expect(body.position.y).toBe(0);
    expect(mover.grounded).toBe(true);
    expect(body.rigidBody.teleport).toHaveBeenCalledWith(
      expect.any(Vector3),
      expect.any(Quaternion),
    );
  });

  it("preserves analog target-relative movement instead of snapping to full diagonals", () => {
    const { mover } = createMoverHarness();

    mover.move(0.2, 1);

    const state = mover.saveState();

    expect(state.direction.x).toBeCloseTo(0.196116, 5);
    expect(state.direction.z).toBeCloseTo(-0.980581, 5);
  });
});
