import {
  createEmptyNetPlatformerCommandFrame,
  createInitialNetPlatformerSimState,
  createNetPlatformerAuthoritativeController,
  createNetPlatformerRollbackCheckpoint,
  createNetPlatformerPredictedController,
  reconcileNetPlatformerPrediction,
  stepNetPlatformerSim,
  type NetPlatformerCommandFrame,
} from "../shared/net-platformer";
import {
  FakeCommandSource,
  FakeNetPlatformerMover,
  normalizeSimState,
} from "./support/net-platformer-test-utils";

function buildClientCommands(): NetPlatformerCommandFrame[] {
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

function buildAuthoritativeCommands(): NetPlatformerCommandFrame[] {
  const clientCommands = buildClientCommands();

  return [
    clientCommands[0]!,
    createEmptyNetPlatformerCommandFrame({
      tick: 2,
      sequence: 2,
      moveY: 1,
      sprint: false,
      jumpPressed: false,
      jumpHeld: false,
      yaw: 0,
    }),
    clientCommands[2]!,
  ];
}

function createCheckpointAt(
  commands: NetPlatformerCommandFrame[],
  commandCount: number,
) {
  const mover = new FakeNetPlatformerMover();
  let simState = createInitialNetPlatformerSimState({ mover } as any);

  commands.slice(0, commandCount).forEach((commandFrame) => {
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
  });

  return createNetPlatformerRollbackCheckpoint(simState, mover.saveState());
}

describe("net-platformer reconciliation", () => {
  it("keeps the predicted state when the authoritative acknowledgement matches", () => {
    const commands = buildClientCommands();
    const mover = new FakeNetPlatformerMover();
    const controller = createNetPlatformerPredictedController({
      host: { mover } as any,
      commandSource: new FakeCommandSource(commands),
      config: {
        speed: 5,
        sprintBoost: 1.8,
      },
      initialState: createInitialNetPlatformerSimState({ mover } as any),
    });

    const predictedStates = commands.map(() => controller.update(1 / 10));
    const result = reconcileNetPlatformerPrediction(
      controller,
      { tick: predictedStates[1]!.tick, sequence: predictedStates[1]!.sequence },
      createCheckpointAt(commands, 2),
      1 / 10,
    );

    expect(result.corrected).toBe(false);
    expect(result.replayedCommands).toBe(0);
    expect(normalizeSimState(result.state)).toEqual(
      normalizeSimState(predictedStates[2]!),
    );
    expect(normalizeSimState(result.predictedStateAtAcknowledgement!)).toEqual(
      normalizeSimState(predictedStates[1]!),
    );
    expect(controller.getPendingCommands().map(({ sequence }) => sequence)).toEqual(
      [3],
    );
  });

  it("restores the authoritative state and replays pending commands when the client drifts", () => {
    const clientCommands = buildClientCommands();
    const authoritativeCommands = buildAuthoritativeCommands();

    const predictedMover = new FakeNetPlatformerMover();
    const predictedController = createNetPlatformerPredictedController({
      host: { mover: predictedMover } as any,
      commandSource: new FakeCommandSource(clientCommands),
      config: {
        speed: 5,
        sprintBoost: 1.8,
      },
      initialState: createInitialNetPlatformerSimState({ mover: predictedMover } as any),
    });

    const clientPredictedStates = clientCommands.map(() =>
      predictedController.update(1 / 10),
    );

    const authoritativeMover = new FakeNetPlatformerMover();
    const authoritativeController = createNetPlatformerAuthoritativeController({
      host: { mover: authoritativeMover } as any,
      config: {
        speed: 5,
        sprintBoost: 1.8,
      },
      initialState: createInitialNetPlatformerSimState({
        mover: authoritativeMover,
      } as any),
    });

    authoritativeCommands.forEach((commandFrame) => {
      authoritativeController.enqueue(commandFrame);
    });

    authoritativeController.update(1 / 10);
    const authoritativeCheckpointAtAcknowledgement =
      authoritativeController.update(1 / 10)!;
    const expectedReplayedState = authoritativeController.update(1 / 10)!;

    const result = reconcileNetPlatformerPrediction(
      predictedController,
      {
        tick: authoritativeCheckpointAtAcknowledgement.snapshot.tick,
        sequence: authoritativeCheckpointAtAcknowledgement.snapshot.sequence,
      },
      authoritativeCheckpointAtAcknowledgement,
      1 / 10,
    );

    expect(normalizeSimState(clientPredictedStates[1]!)).not.toEqual(
      normalizeSimState(authoritativeCheckpointAtAcknowledgement.snapshot),
    );
    expect(result.corrected).toBe(true);
    expect(result.replayedCommands).toBe(1);
    expect(normalizeSimState(result.state)).toEqual(
      normalizeSimState(expectedReplayedState.snapshot),
    );
    expect(normalizeSimState(predictedController.getPredictedState())).toEqual(
      normalizeSimState(expectedReplayedState.snapshot),
    );
    expect(predictedController.getPendingCommands().map(({ sequence }) => sequence)).toEqual(
      [3],
    );

    const rewoundState = predictedController.rewindTo(3);
    expect(normalizeSimState(rewoundState!)).toEqual(
      normalizeSimState(expectedReplayedState.snapshot),
    );
  });
});
