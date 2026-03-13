import {
  createEmptyNetPlatformerCommandFrame,
  createInitialNetPlatformerSimState,
  createNetPlatformerPredictedController,
  type NetPlatformerCommandFrame,
} from "../shared/net-platformer";
import { clonePlainObject } from "../shared/clone-plain-object";
import {
  FakeCommandSource,
  FakeNetPlatformerMover,
  normalizeSimState,
} from "./support/net-platformer-test-utils";

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
      moveX: 1,
      sprint: true,
      jumpReleased: true,
      yaw: Math.PI / 2,
    }),
  ];
}

describe("net-platformer predicted controller", () => {
  it("buffers pending commands and tracks the last acknowledged predicted state", () => {
    const commands = buildRecordedCommands();
    const mover = new FakeNetPlatformerMover();
    const commandSource = new FakeCommandSource(commands);
    const controller = createNetPlatformerPredictedController({
      host: { mover } as any,
      commandSource,
      config: {
        speed: 5,
        sprintBoost: 1.8,
      },
      initialState: createInitialNetPlatformerSimState({ mover } as any),
    });

    const predictedStates = commands.map(() => controller.update(1 / 10));

    expect(controller.getPendingCommands().map(({ sequence }) => sequence)).toEqual(
      [1, 2, 3],
    );
    expect(predictedStates[2]?.sequence).toBe(3);

    controller.acknowledge(
      { tick: predictedStates[1]!.tick, sequence: predictedStates[1]!.sequence },
      clonePlainObject(predictedStates[1]!),
    );

    expect(controller.getPendingCommands().map(({ sequence }) => sequence)).toEqual(
      [3],
    );
    expect(controller.getLastAcknowledgement()).toEqual({
      tick: 2,
      sequence: 2,
    });
    expect(normalizeSimState(controller.getLastAcknowledgedState()!)).toEqual(
      normalizeSimState(predictedStates[1]!),
    );
    expect(normalizeSimState(controller.getLastAuthoritativeSnapshot()!)).toEqual(
      normalizeSimState(predictedStates[1]!),
    );

    const rewoundState = controller.rewindTo(2);
    expect(normalizeSimState(rewoundState!)).toEqual(
      normalizeSimState(predictedStates[1]!),
    );
    expect(controller.getPendingCommands().map(({ sequence }) => sequence)).toEqual(
      [3],
    );

    const replayedState = controller.update(1 / 10);
    expect(normalizeSimState(replayedState)).toEqual(
      normalizeSimState(predictedStates[2]!),
    );

    controller.acknowledge({
      tick: 1,
      sequence: 1,
    });

    expect(controller.getPendingCommands().map(({ sequence }) => sequence)).toEqual(
      [3],
    );
    expect(controller.getLastAcknowledgement()).toEqual({
      tick: 2,
      sequence: 2,
    });
  });
});
