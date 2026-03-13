import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Room } from "@colyseus/sdk";
import { Client } from "@colyseus/sdk";
import { EngineHeadless } from "@oncyberio/engine/engine-headless";
import { Mover } from "@oncyberio/engine/controls";
import {
  createNetPlatformerPredictedController,
  reconcileNetPlatformerPrediction,
  type CommandSource,
  type NetPlatformerCommandFrame,
} from "../../shared/net-platformer";
import type { Space } from "@oncyberio/engine";
import { ComponentReplica } from "../../src/multiplayer/component-replica";
import type { GameState, PlayerState } from "../../shared/game-state";
import {
  PLAYER_COMMAND_MESSAGE,
  PLAYER_SNAPSHOT_MESSAGE,
  isPlayerSnapshotMessage,
} from "../../shared/messages";
import {
  multiplayerNetPlatformerOptions,
  serverPlayerColliderOffset,
  serverPlayerBodyDimensions,
} from "../../shared/net-platformer-options";

const __dirname = dirname(fileURLToPath(import.meta.url));
const staticScenePath = resolve(__dirname, "../../public/data/static-scene.json");
const FIXED_DT = 1 / 60;
const FIXED_DT_MS = FIXED_DT * 1000;
const FINAL_LINGER_MS = 1500;

interface HeadlessClientConfig {
  port: number;
  name: string;
  expectedPlayers: number;
  tape: Array<Partial<Omit<NetPlatformerCommandFrame, "tick" | "sequence">>>;
  settleTicks?: number;
}

interface HeadlessClientResult {
  name: string;
  sessionId: string;
  correctionCount: number;
  pendingCommands: number;
  lastAcknowledgedSequence: number;
  predictedState: ReturnType<
    ReturnType<typeof createNetPlatformerPredictedController>["getPredictedState"]
  >;
  authoritativeSnapshot: ReturnType<
    ReturnType<typeof createNetPlatformerPredictedController>["getLastAuthoritativeSnapshot"]
  >;
  roomPlayers: Array<{
    sessionId: string;
    x: number;
    y: number;
    z: number;
    rotY: number;
    tick: number;
    sequence: number;
    anim: string;
    updatedAt: number;
  }>;
  remoteComponents: Record<
    string,
    {
      x: number;
      y: number;
      z: number;
      rotY: number;
    }
  >;
}

interface SceneGameData {
  id: string;
  creatorId?: string;
  editors?: string[];
  components: Record<string, any>;
}

class TapeCommandSource implements CommandSource<NetPlatformerCommandFrame> {
  private index = -1;
  private tick = 0;
  private lastYaw = 0;
  private currentFrame: NetPlatformerCommandFrame = {
    tick: 0,
    sequence: 0,
    moveX: 0,
    moveY: 0,
    sprint: false,
    jumpPressed: false,
    jumpReleased: false,
    jumpHeld: false,
    yaw: 0,
  };

  constructor(
    private readonly tape: Array<
      Partial<Omit<NetPlatformerCommandFrame, "tick" | "sequence">>
    >,
  ) {}

  update(): void {
    this.index += 1;
    this.tick += 1;

    const next = this.tape[this.index] ?? {};
    this.lastYaw = next.yaw ?? this.lastYaw;
    this.currentFrame = {
      tick: this.tick,
      sequence: this.tick,
      moveX: next.moveX ?? 0,
      moveY: next.moveY ?? 0,
      sprint: next.sprint ?? false,
      jumpPressed: next.jumpPressed ?? false,
      jumpReleased: next.jumpReleased ?? false,
      jumpHeld: next.jumpHeld ?? false,
      yaw: next.yaw ?? this.lastYaw,
    };
  }

  read(): NetPlatformerCommandFrame {
    return this.currentFrame;
  }

  dispose(): void {}
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
  message: string,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }

    await sleep(25);
  }

  throw new Error(message);
}

function createPlayerBodyData(
  id: string,
  collider: boolean,
): Record<string, unknown> {
  return {
    id,
    name: id,
    type: "mesh",
    display: false,
    displayInEditor: false,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    geometry: {
      type: "box",
      boxParams: { ...serverPlayerBodyDimensions },
      sphereParams: {
        radius: 1,
        widthSegments: 8,
        heightSegments: 8,
      },
      cylinderParams: {
        radiusTop: 1,
        radiusBottom: 1,
        height: 1,
        radialSegments: 8,
        heightSegments: 1,
        openEnded: false,
      },
    },
    ...(collider
      ? {
          collider: {
            enabled: true,
            rigidbodyType: "PLAYER",
            colliderType: "CAPSULE",
            position: { ...serverPlayerColliderOffset },
          },
          script: {
            identifier: id,
            _isPlayer: true,
          },
          _IS_PLAYER: true,
        }
      : {}),
  };
}

async function loadTerrainOnlyGame(): Promise<SceneGameData> {
  const raw = JSON.parse(
    await readFile(staticScenePath, "utf8"),
  ) as SceneGameData;
  const components = Object.fromEntries(
    Object.entries(raw.components).filter(([, component]) => {
      return component?.type === "terrain";
    }),
  );

  return {
    id: `${raw.id}-headless-client`,
    creatorId: raw.creatorId,
    editors: raw.editors,
    components,
  };
}

function getRoomPlayers(room: Room<any, GameState>) {
  const players = room.state?.players as
    | {
        values?: () => IterableIterator<PlayerState>;
        forEach?: (cb: (player: PlayerState) => void) => void;
      }
    | undefined;

  if (!players) {
    return [];
  }

  const entries =
    typeof players.values === "function"
      ? Array.from(players.values())
      : (() => {
          const fallback: PlayerState[] = [];
          players.forEach?.((player) => {
            fallback.push(player);
          });
          return fallback;
        })();

  return entries.map((player) => ({
    sessionId: player.sessionId,
    x: player.x,
    y: player.y,
    z: player.z,
    rotY: player.rotY,
    tick: player.tick,
    sequence: player.sequence,
    anim: player.anim,
    updatedAt: player.updatedAt,
  }));
}

async function waitForEngineReset(engine: EngineHeadless): Promise<void> {
  for (let i = 0; i < 40 && engine.sessionState !== "void"; i += 1) {
    await sleep(50);
  }
}

async function run(): Promise<void> {
  const rawConfig = process.argv[2];
  if (!rawConfig) {
    throw new Error("Missing headless client config");
  }

  const config = JSON.parse(rawConfig) as HeadlessClientConfig;
  const engine = new EngineHeadless();
  const game = await loadTerrainOnlyGame();
  const { space, reveal } = await engine.createSpace({
    runtime: "headless",
    mode: "game",
    game,
    user: { id: config.name, name: config.name },
  });

  await reveal();
  space.start();

  let room: Room<any, GameState> | null = null;
  const remoteComponents = new Map<string, any>();

  try {
    const localBody = await space.components.create(
      createPlayerBodyData(`client-local-${config.name}`, true) as any,
    );
    engine.tick(FIXED_DT);
    const mover = new Mover({
      body: localBody,
      movement: multiplayerNetPlatformerOptions,
      jump: multiplayerNetPlatformerOptions,
    });
    const commandSource = new TapeCommandSource(config.tape);
    const controller = createNetPlatformerPredictedController({
      host: { mover },
      commandSource,
      config: {
        speed: multiplayerNetPlatformerOptions.speed ?? 15,
        sprintBoost: multiplayerNetPlatformerOptions.sprintBoost ?? 1.5,
      },
    });

    const client = new Client(`ws://127.0.0.1:${config.port}`);
    room = await client.joinOrCreate<GameState>("game", {});

    let correctionCount = 0;

    const offSnapshot = room.onMessage(
      PLAYER_SNAPSHOT_MESSAGE,
      (payload: unknown) => {
        if (!isPlayerSnapshotMessage(payload)) {
          return;
        }

        if (payload.sessionId !== room?.sessionId) {
          return;
        }

        const result = reconcileNetPlatformerPrediction(
          controller,
          payload.acknowledgement,
          payload.authoritativeCheckpoint,
          FIXED_DT,
        );

        if (result.corrected) {
          correctionCount += 1;
        }
      },
    );

    const replica = new ComponentReplica<GameState, PlayerState, any>({
      room,
      stateKey: "players",
      space: space as Space,
      spec: {
        isLocal(model, targetRoom) {
          return model.sessionId === targetRoom.sessionId;
        },
        async createComponent({ model, isLocal, space: targetSpace }) {
          if (isLocal) {
            return localBody;
          }

          const component = await targetSpace.components.create(
            createPlayerBodyData(`remote-${model.sessionId}`, false) as any,
          );
          remoteComponents.set(model.sessionId, component);
          return component;
        },
        destroyComponent(component) {
          if (component === localBody) {
            return;
          }

          for (const [sessionId, remoteComponent] of remoteComponents.entries()) {
            if (remoteComponent === component) {
              remoteComponents.delete(sessionId);
              break;
            }
          }

          component.destroy();
        },
        getTransform(model) {
          return {
            position: { x: model.x, y: model.y, z: model.z },
            rotation: { x: 0, y: model.rotY, z: 0 },
            updatedAt: model.updatedAt || Date.now(),
          };
        },
      },
      transformSync: {
        lockRotation: { x: true, z: true },
      },
    });
    replica.init();

    await waitFor(
      () => getRoomPlayers(room!).length >= config.expectedPlayers,
      10000,
      `[${config.name}] Timed out waiting for ${config.expectedPlayers} players`,
    );

    for (let i = 0; i < config.tape.length; i += 1) {
      controller.update(FIXED_DT);
      room.send(PLAYER_COMMAND_MESSAGE, commandSource.read());
      replica.update(FIXED_DT);
      engine.tick(FIXED_DT);
      await sleep(FIXED_DT_MS);
    }

    const lastSentSequence = commandSource.read().sequence;

    await waitFor(
      () =>
        (controller.getLastAcknowledgement()?.sequence ?? 0) >= lastSentSequence,
      5000,
      `[${config.name}] Timed out waiting for acknowledgement ${lastSentSequence}`,
    );

    const settleTicks = config.settleTicks ?? 36;
    for (let i = 0; i < settleTicks; i += 1) {
      replica.update(FIXED_DT);
      engine.tick(FIXED_DT);
      await sleep(FIXED_DT_MS);
    }

    const getRemoteConvergenceError = (): number | null => {
      const roomPlayers = getRoomPlayers(room!);
      if (roomPlayers.length < config.expectedPlayers) {
        return null;
      }

      let maxDistance = 0;
      for (const player of roomPlayers) {
        if (player.sessionId === room!.sessionId) {
          continue;
        }

        const component = remoteComponents.get(player.sessionId);
        if (!component) {
          return null;
        }

        const dx = component.position.x - player.x;
        const dy = component.position.y - player.y;
        const dz = component.position.z - player.z;
        maxDistance = Math.max(maxDistance, Math.hypot(dx, dy, dz));
      }

      return maxDistance;
    };

    const remoteTolerance = 0.6;
    const convergenceDeadline = Date.now() + 4000;
    let remoteConvergenceError = getRemoteConvergenceError();

    while (
      (remoteConvergenceError === null ||
        remoteConvergenceError > remoteTolerance) &&
      Date.now() < convergenceDeadline
    ) {
      replica.update(FIXED_DT);
      engine.tick(FIXED_DT);
      await sleep(FIXED_DT_MS);
      remoteConvergenceError = getRemoteConvergenceError();
    }

    if (
      remoteConvergenceError === null ||
      remoteConvergenceError > remoteTolerance
    ) {
      throw new Error(
        `[${config.name}] Remote replica did not converge before final capture (error=${remoteConvergenceError ?? "missing"})`,
      );
    }

    const result: HeadlessClientResult = {
      name: config.name,
      sessionId: room.sessionId,
      correctionCount,
      pendingCommands: controller.getPendingCommands().length,
      lastAcknowledgedSequence:
        controller.getLastAcknowledgement()?.sequence ?? 0,
      predictedState: controller.getPredictedState(),
      authoritativeSnapshot: controller.getLastAuthoritativeSnapshot(),
      roomPlayers: getRoomPlayers(room),
      remoteComponents: Object.fromEntries(
        Array.from(remoteComponents.entries()).map(([sessionId, component]) => [
          sessionId,
          {
            x: component.position.x,
            y: component.position.y,
            z: component.position.z,
            rotY: component.rotation.y,
          },
        ]),
      ),
    };

    process.stdout.write(`__RESULT__${JSON.stringify(result)}\n`);
    await sleep(FINAL_LINGER_MS);

    offSnapshot();
    replica.dispose();
    controller.dispose();
    mover.dispose();
    localBody.destroy();
    await room.leave();
    room = null;

    space.destroy();
    await waitForEngineReset(engine);
  } finally {
    if (room) {
      try {
        await room.leave();
      } catch {}
    }

    if (space) {
      try {
        space.destroy();
      } catch {}
    }

    await waitForEngineReset(engine);
  }
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[HeadlessClient] Failed", error);
    process.exit(1);
  });
