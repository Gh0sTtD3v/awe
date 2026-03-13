import {
  createEmptyNetPlatformerCommandFrame,
  createInitialNetPlatformerSimState,
  createNetInputQueue,
  createNetPlatformerAuthoritativeController,
  stepNetPlatformerSim,
  type NetPlatformerCommandFrame,
} from "../shared/net-platformer";
import {
  FakeNetPlatformerMover,
  normalizeSimState,
} from "./support/net-platformer-test-utils";
import { clonePlainObject } from "../shared/clone-plain-object";

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

describe("net-platformer server input queue", () => {
  it("orders out-of-order arrivals and rejects stale or conflicting commands", () => {
    const commands = buildRecordedCommands();
    const queue = createNetInputQueue({
      cloneCommand: clonePlainObject,
    });

    expect(queue.enqueue(commands[2]!)).toBe(true);
    expect(queue.enqueue(commands[0]!)).toBe(true);
    expect(queue.enqueue(commands[1]!)).toBe(true);
    expect(queue.enqueue(commands[1]!)).toBe(false);
    expect(
      queue.enqueue(
        createEmptyNetPlatformerCommandFrame({
          tick: 2,
          sequence: 4,
          moveX: -1,
        }),
      ),
    ).toBe(false);
    expect(
      queue.enqueue(
        createEmptyNetPlatformerCommandFrame({
          tick: 4,
          sequence: 2,
          moveX: -1,
        }),
      ),
    ).toBe(false);

    expect(queue.getPendingCommands().map(({ tick }) => tick)).toEqual([1, 2, 3]);
    expect(queue.dequeue(1)?.sequence).toBe(1);
    expect(
      queue.enqueue(
        createEmptyNetPlatformerCommandFrame({
          tick: 1,
          sequence: 1,
          moveY: -1,
        }),
      ),
    ).toBe(false);
    expect(queue.dequeue(2)?.sequence).toBe(2);
    expect(queue.dequeue(3)?.sequence).toBe(3);
    expect(queue.getPendingCommands()).toEqual([]);
  });
});

describe("net-platformer authoritative controller", () => {
  it("waits for the next tick, then publishes authoritative snapshots and acknowledgements", () => {
    const commands = buildRecordedCommands();
    const expectedStates = replayCommands(commands);
    const mover = new FakeNetPlatformerMover();
    const controller = createNetPlatformerAuthoritativeController({
      host: { mover } as any,
      config: {
        speed: 5,
        sprintBoost: 1.8,
      },
      initialState: createInitialNetPlatformerSimState({ mover } as any),
    });

    expect(controller.enqueue(commands[2]!)).toBe(true);
    expect(controller.enqueue(commands[0]!)).toBe(true);

    const firstCheckpoint = controller.update(1 / 10);
    expect(normalizeSimState(firstCheckpoint!.snapshot)).toEqual(expectedStates[0]);
    expect(controller.getLastAcknowledgement()).toEqual({
      tick: 1,
      sequence: 1,
    });

    expect(controller.update(1 / 10)).toBeNull();
    expect(controller.getPendingCommands().map(({ tick }) => tick)).toEqual([3]);

    expect(controller.enqueue(commands[1]!)).toBe(true);

    const secondCheckpoint = controller.update(1 / 10);
    expect(normalizeSimState(secondCheckpoint!.snapshot)).toEqual(expectedStates[1]);

    const thirdCheckpoint = controller.update(1 / 10);
    expect(normalizeSimState(thirdCheckpoint!.snapshot)).toEqual(expectedStates[2]);
    expect(normalizeSimState(controller.getLastSnapshot()!)).toEqual(
      expectedStates[2],
    );
    expect(normalizeSimState(controller.getLastCheckpoint()!.snapshot)).toEqual(
      expectedStates[2],
    );
    expect(normalizeSimState(controller.getAuthoritativeState())).toEqual(
      expectedStates[2],
    );
    expect(controller.getLastProcessedCommand()).toEqual(commands[2]);
    expect(controller.getLastAcknowledgement()).toEqual({
      tick: 3,
      sequence: 3,
    });
    expect(controller.getPendingCommands()).toEqual([]);
  });
});
