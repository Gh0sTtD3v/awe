import {
  createEmptyNetPlatformerCommandFrame,
  createInitialNetPlatformerSimState,
  stepNetPlatformerSim,
  type NetPlatformerCommandFrame,
} from "../shared/net-platformer";
import { FakeNetPlatformerMover, normalizeSimState } from "./support/net-platformer-test-utils";

function buildRecordedCommands(): NetPlatformerCommandFrame[] {
  return [
    createEmptyNetPlatformerCommandFrame({
      tick: 1,
      sequence: 1,
      moveY: 1,
      yaw: 0,
    }),
    createEmptyNetPlatformerCommandFrame({
      tick: 2,
      sequence: 2,
      moveY: 1,
      sprint: true,
      jumpPressed: true,
      jumpHeld: true,
      yaw: 0,
    }),
    createEmptyNetPlatformerCommandFrame({
      tick: 3,
      sequence: 3,
      moveY: 1,
      sprint: true,
      jumpHeld: true,
      yaw: 0,
    }),
    createEmptyNetPlatformerCommandFrame({
      tick: 4,
      sequence: 4,
      moveX: 1,
      sprint: true,
      jumpReleased: true,
      yaw: Math.PI / 2,
    }),
    createEmptyNetPlatformerCommandFrame({
      tick: 5,
      sequence: 5,
      moveX: 1,
      yaw: Math.PI / 2,
    }),
    createEmptyNetPlatformerCommandFrame({
      tick: 6,
      sequence: 6,
      moveX: -1,
      yaw: Math.PI,
    }),
    createEmptyNetPlatformerCommandFrame({
      tick: 7,
      sequence: 7,
      moveY: -1,
      yaw: -Math.PI / 2,
    }),
    createEmptyNetPlatformerCommandFrame({
      tick: 8,
      sequence: 8,
      yaw: -Math.PI / 2,
    }),
  ];
}

function replayCommands(
  commands: NetPlatformerCommandFrame[],
): ReturnType<typeof normalizeSimState>[] {
  const mover = new FakeNetPlatformerMover();
  let simState = createInitialNetPlatformerSimState({ mover } as any);

  return commands.map((commandFrame) => {
    simState = stepNetPlatformerSim(
      { mover } as any,
      simState,
      commandFrame,
      1 / 10,
      {
        speed: 5,
        sprintBoost: 1.8,
      },
    );

    return normalizeSimState(simState);
  });
}

describe("net-platformer replay", () => {
  it("replays recorded command frames deterministically, including yaw and jump edges", () => {
    const commands = buildRecordedCommands();
    const firstReplay = replayCommands(commands);
    const secondReplay = replayCommands(commands);
    const withoutJumpRelease = replayCommands(
      commands.map((commandFrame, index) =>
        index === 3
          ? { ...commandFrame, jumpReleased: false }
          : commandFrame,
      ),
    );
    const withoutYawTurn = replayCommands(
      commands.map((commandFrame, index) =>
        index === 3
          ? { ...commandFrame, yaw: 0 }
          : commandFrame,
      ),
    );

    expect(secondReplay).toEqual(firstReplay);

    expect(firstReplay[1]?.derived.jumpedThisTick).toBe(true);
    expect(firstReplay[1]?.derived.jumpSpeedCategory).toBe(
      firstReplay[0]?.mover.speedCategory,
    );
    expect(withoutJumpRelease[3]?.mover.position.y).toBeGreaterThan(
      firstReplay[3]?.mover.position.y ?? 0,
    );
    expect({
      x: withoutYawTurn[3]?.mover.position.x,
      z: withoutYawTurn[3]?.mover.position.z,
    }).not.toEqual({
      x: firstReplay[3]?.mover.position.x,
      z: firstReplay[3]?.mover.position.z,
    });
  });
});
