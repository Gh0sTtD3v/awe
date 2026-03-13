import { Quaternion, Vector3 } from "three";
import { Mover, type MoverConfig } from "../../src/controls/mover";

function createMoverHarness(config: Partial<Omit<MoverConfig, "body">> = {}) {
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

  const mover = new Mover({
    body: body as any,
    ...config,
  });

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

  it("faces the target yaw while idle when facingMode is target", () => {
    const target = {
      position: new Vector3(),
      quaternion: new Quaternion().setFromAxisAngle(
        new Vector3(0, 1, 0),
        Math.PI / 4,
      ),
    };
    const { mover, body } = createMoverHarness({
      target: target as any,
      movement: { facingMode: "target" },
    });
    const expected = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      Math.PI / 4,
    );

    mover.update(1);

    expect(body.quaternion.angleTo(expected)).toBeCloseTo(0, 5);
  });

  it("keeps autoRotate as an alias for movement-facing rotation", () => {
    const { mover } = createMoverHarness({
      movement: { facingMode: "target" },
    });

    expect(mover.autoRotate).toBe(false);

    mover.autoRotate = true;
    expect(mover.facingMode).toBe("movement");

    mover.autoRotate = false;
    expect(mover.facingMode).toBe("none");
  });
});
