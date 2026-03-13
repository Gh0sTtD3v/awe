import net from "node:net";
import { once } from "node:events";
import { spawn, type ChildProcess } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Client, type Room } from "@colyseus/sdk";
import {
  createPlayersReplica,
  type PlayersReplica,
} from "../src/multiplayer/players-replica";
import { GameState, PlayerState } from "../shared/game-state";
import {
  PLAYER_ANIMATION_MESSAGE,
  PLAYER_COMMAND_MESSAGE,
  PLAYER_SNAPSHOT_MESSAGE,
  type PlayerSnapshotMessage,
} from "../shared/messages";

interface FakeAvatar {
  id: string;
  destroy: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  data: {
    animation: string;
  };
  position: {
    x: number;
    y: number;
    z: number;
    set: (x: number, y: number, z: number) => void;
  };
  rotation: {
    y: number;
  };
}

interface TestSession {
  replica: PlayersReplica | null;
  mockSpace: ReturnType<typeof createMockSpace> | null;
  room: Room<any, GameState>;
  closed: boolean;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const exampleRoot = resolve(__dirname, "..");
const testServerPath = resolve(exampleRoot, "test/support/test-server.ts");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const playerAvatarTemplate = {
  type: "avatar",
  id: "player-template",
  url: "https://example.com/avatar.glb",
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 0.71, y: 0.71, z: 0.71 },
  useCpuAnimation: true,
  animation: "idle",
  opacity: 1,
};

let port = 0;
let serverProcess: ChildProcess | null = null;
const sessions = new Set<TestSession>();

function createMockSpace() {
  const avatars: FakeAvatar[] = [];

  const createComponent = vi.fn(async (config: any) => {
    const avatar: FakeAvatar = {
      id: config.id,
      destroy: vi.fn(),
      play: vi.fn((animation: string) => {
        avatar.data.animation = animation;
      }),
      data: {
        animation: config.animation ?? "idle",
      },
      position: {
        x: config.position.x,
        y: config.position.y,
        z: config.position.z,
        set(x: number, y: number, z: number) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      },
      rotation: {
        y: config.rotation.y,
      },
    };

    avatars.push(avatar);
    return avatar;
  });

  return {
    avatars,
    createComponent,
    space: {
      components: {
        create: createComponent,
      },
    },
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

async function waitFor<T>(
  callback: () => T,
  timeoutMs = 5000,
  intervalMs = 25,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      return callback();
    } catch (error) {
      lastError = error;
      await sleep(intervalMs);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Timed out waiting for condition");
}

async function getFreePort(): Promise<number> {
  return new Promise((resolvePromise, rejectPromise) => {
    const server = net.createServer();

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        rejectPromise(new Error("Could not allocate a port"));
        return;
      }

      server.close((error) => {
        if (error) {
          rejectPromise(error);
          return;
        }

        resolvePromise(address.port);
      });
    });

    server.on("error", rejectPromise);
  });
}

async function startServer(): Promise<ChildProcess> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      pnpmCommand,
      ["exec", "tsx", testServerPath],
      {
        cwd: exampleRoot,
        env: {
          ...process.env,
          PORT: String(port),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let output = "";
    let settled = false;
    const readyText = `[TestServer] Listening on port ${port}`;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      rejectPromise(
        new Error(`Timed out starting test server.\n${output}`),
      );
      child.kill("SIGTERM");
    }, 15000);

    const finishResolve = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.stdout?.off("data", handleOutput);
      child.stderr?.off("data", handleOutput);
      resolvePromise(child);
    };

    const finishReject = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.stdout?.off("data", handleOutput);
      child.stderr?.off("data", handleOutput);
      rejectPromise(error);
    };

    const handleOutput = (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes(readyText)) {
        finishResolve();
      }
    };

    child.stdout?.on("data", handleOutput);
    child.stderr?.on("data", handleOutput);

    child.once("exit", (code) => {
      finishReject(
        new Error(`Test server exited early with code ${code}.\n${output}`),
      );
    });

    child.once("error", (error) => {
      finishReject(error);
    });
  });
}

async function stopServer(child: ChildProcess | null): Promise<void> {
  if (!child || child.exitCode !== null) return;

  child.kill("SIGTERM");
  await once(child, "exit");
}

async function connectSession(withReplica = true): Promise<TestSession> {
  const client = new Client(`ws://127.0.0.1:${port}`);
  const room = await client.joinOrCreate<GameState>("game", {});
  room.onMessage(PLAYER_SNAPSHOT_MESSAGE, () => {});

  const mockSpace = withReplica ? createMockSpace() : null;
  const replica = mockSpace
    ? createPlayersReplica(
        room,
        mockSpace.space as any,
        playerAvatarTemplate as any,
      )
    : null;
  replica?.init();

  const session: TestSession = {
    replica,
    mockSpace,
    room,
    closed: false,
  };

  sessions.add(session);
  return session;
}

async function closeSession(session: TestSession): Promise<void> {
  if (session.closed) return;

  session.closed = true;
  session.replica?.dispose();

  try {
    await session.room.leave();
  } catch {
    // Room may already be closed as part of the test flow.
  }

  sessions.delete(session);
}

function getPlayer(
  room: Room<any, GameState>,
  sessionId: string,
): PlayerState | undefined {
  return room.state.players.get(sessionId) as PlayerState | undefined;
}

function createCommand(overrides: Partial<{
  tick: number;
  sequence: number;
  moveX: number;
  moveY: number;
  sprint: boolean;
  jumpPressed: boolean;
  jumpReleased: boolean;
  jumpHeld: boolean;
  yaw: number;
}> = {}) {
  return {
    tick: overrides.tick ?? 1,
    sequence: overrides.sequence ?? overrides.tick ?? 1,
    moveX: overrides.moveX ?? 0,
    moveY: overrides.moveY ?? 0,
    sprint: overrides.sprint ?? false,
    jumpPressed: overrides.jumpPressed ?? false,
    jumpReleased: overrides.jumpReleased ?? false,
    jumpHeld: overrides.jumpHeld ?? false,
    yaw: overrides.yaw ?? 0,
  };
}

async function waitForRoomMessage<T>(
  room: Room<any, GameState>,
  type: string,
  predicate: (payload: T) => boolean = () => true,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise<T>((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => {
      off();
      rejectPromise(new Error(`Timed out waiting for room message "${type}"`));
    }, timeoutMs);

    const off = room.onMessage(type as never, (payload: T) => {
      if (!predicate(payload)) {
        return;
      }

      clearTimeout(timeout);
      off();
      resolvePromise(payload);
    });
  });
}

describe("multiplayer integration", () => {
  beforeAll(async () => {
    port = await getFreePort();
    serverProcess = await startServer();
  });

  afterEach(async () => {
    for (const session of Array.from(sessions)) {
      await closeSession(session);
    }
  });

  afterAll(async () => {
    await stopServer(serverProcess);
  });

  it("hydrates joined state as PlayerState instances and exposes the local avatar through PlayersReplica", async () => {
    const session = await connectSession();

    const player = await waitFor(() => {
      const match = getPlayer(session.room, session.room.sessionId);
      expect(match).toBeDefined();
      return match as PlayerState;
    });

    const avatar = await session.replica?.whenLocalComponentReady();

    expect(avatar).toBeDefined();
    expect(player.sessionId).toBe(session.room.sessionId);
    expect(session.mockSpace?.avatars).toHaveLength(1);
  });

  it("creates and destroys remote avatars through PlayersReplica lifecycle hooks", async () => {
    const sessionA = await connectSession();
    const sessionB = await connectSession(false);

    const remoteAvatar = await waitFor(() => {
      expect(sessionA.mockSpace?.avatars).toHaveLength(2);
      const avatar = sessionA.mockSpace?.avatars.find(
        (candidate) => candidate.id === `player-${sessionB.room.sessionId}`,
      );
      expect(avatar).toBeDefined();
      return avatar as FakeAvatar;
    });

    await closeSession(sessionB);

    await waitFor(() => {
      expect(remoteAvatar.destroy).toHaveBeenCalledTimes(1);
      expect(getPlayer(sessionA.room, remoteAvatar.id.replace("player-", ""))).toBeUndefined();
    });
  });

  it("processes player:command messages through server authority and publishes owner snapshots", async () => {
    const sessionA = await connectSession();
    const sessionB = await connectSession(false);
    const payload = createCommand({
      tick: 1,
      sequence: 1,
      moveY: 1,
      yaw: 0,
    });
    const snapshotPromise = waitForRoomMessage<PlayerSnapshotMessage>(
      sessionA.room,
      PLAYER_SNAPSHOT_MESSAGE,
      (message) =>
        message.sessionId === sessionA.room.sessionId &&
        message.acknowledgement.sequence === payload.sequence,
    );

    sessionA.room.send(PLAYER_COMMAND_MESSAGE, payload);

    const snapshotMessage = await snapshotPromise;
    expect(snapshotMessage.acknowledgement.tick).toBe(payload.tick);
    expect(snapshotMessage.acknowledgement.sequence).toBe(payload.sequence);
    expect(snapshotMessage.authoritativeCheckpoint.snapshot.sequence).toBe(payload.sequence);
    expect(snapshotMessage.authoritativeCheckpoint.snapshot.mover.grounded).toBe(true);
    expect(snapshotMessage.authoritativeCheckpoint.snapshot.mover.position.y).toBeGreaterThan(
      -1e-6,
    );

    const replicated = await waitFor(() => {
      const player = getPlayer(sessionB.room, sessionA.room.sessionId);

      expect(player).toBeDefined();
      expect(player?.tick).toBe(payload.tick);
      expect(player?.sequence).toBe(payload.sequence);
      expect(player?.anim).toBe("idle");
      expect(player?.updatedAt).toBeGreaterThan(0);
      expect(Number.isFinite(player?.x)).toBe(true);
      expect(Number.isFinite(player?.y)).toBe(true);
      expect(Number.isFinite(player?.z)).toBe(true);
      return player as PlayerState;
    });

    expect(replicated.sessionId).toBe(sessionA.room.sessionId);
  });

  it("replicates client-owned animation changes to remote avatars", async () => {
    const sessionA = await connectSession();
    const sessionB = await connectSession(false);

    const remoteAvatar = await waitFor(() => {
      expect(sessionA.mockSpace?.avatars).toHaveLength(2);
      const avatar = sessionA.mockSpace?.avatars.find(
        (candidate) => candidate.id === `player-${sessionB.room.sessionId}`,
      );
      expect(avatar).toBeDefined();
      return avatar as FakeAvatar;
    });

    sessionB.room.send(PLAYER_ANIMATION_MESSAGE, {
      animation: "jump_running",
    });

    await waitFor(() => {
      const player = getPlayer(sessionA.room, sessionB.room.sessionId);
      expect(player?.anim).toBe("jump_running");
      expect(remoteAvatar.play).toHaveBeenCalledWith("jump_running", {
        fadeIn: 0.15,
      });
      expect(remoteAvatar.data.animation).toBe("jump_running");
    });
  });

  it("ignores malformed player:command payloads", async () => {
    const session = await connectSession(false);
    const baseline = createCommand({
      tick: 1,
      sequence: 1,
      moveY: 1,
      sprint: true,
      yaw: Math.PI / 2,
    });

    session.room.send(PLAYER_COMMAND_MESSAGE, baseline);

    await waitFor(() => {
      const player = getPlayer(session.room, session.room.sessionId);
      expect(player?.tick).toBe(baseline.tick);
      expect(player?.sequence).toBe(baseline.sequence);
    });

    session.room.send(PLAYER_COMMAND_MESSAGE, {
      tick: "bad",
      sequence: 2,
      moveX: 0,
      moveY: 1,
      sprint: false,
      jumpPressed: false,
      jumpReleased: false,
      jumpHeld: false,
      yaw: 0,
    } as any);

    await sleep(250);

    const player = getPlayer(session.room, session.room.sessionId);
    expect(player?.tick).toBe(baseline.tick);
    expect(player?.sequence).toBe(baseline.sequence);
  });

  it("ignores malformed player:animation payloads", async () => {
    const session = await connectSession(false);

    session.room.send(PLAYER_ANIMATION_MESSAGE, {
      animation: "run",
    });

    await waitFor(() => {
      const player = getPlayer(session.room, session.room.sessionId);
      expect(player?.anim).toBe("run");
    });

    session.room.send(PLAYER_ANIMATION_MESSAGE, {
      animation: "",
    } as any);

    await sleep(250);

    const player = getPlayer(session.room, session.room.sessionId);
    expect(player?.anim).toBe("run");
  });

  it("updates only the sending client's player state", async () => {
    const sessionA = await connectSession(false);
    const sessionB = await connectSession(false);
    const baselineA = createCommand({
      tick: 1,
      sequence: 1,
      moveY: 1,
      yaw: Math.PI / 4,
    });
    const updateB = createCommand({
      tick: 1,
      sequence: 1,
      moveX: 1,
      jumpPressed: true,
      jumpHeld: true,
      yaw: Math.PI / 6,
    });

    sessionA.room.send(PLAYER_COMMAND_MESSAGE, baselineA);

    await waitFor(() => {
      const playerAOnB = getPlayer(sessionB.room, sessionA.room.sessionId);
      expect(playerAOnB?.tick).toBe(baselineA.tick);
      expect(playerAOnB?.sequence).toBe(baselineA.sequence);
    });

    sessionB.room.send(PLAYER_COMMAND_MESSAGE, updateB);

    await waitFor(() => {
      const playerAOnA = getPlayer(sessionA.room, sessionA.room.sessionId);
      const playerAOnB = getPlayer(sessionB.room, sessionA.room.sessionId);
      const playerBOnA = getPlayer(sessionA.room, sessionB.room.sessionId);

      expect(playerAOnA?.tick).toBe(baselineA.tick);
      expect(playerAOnA?.sequence).toBe(baselineA.sequence);

      expect(playerAOnB?.tick).toBe(baselineA.tick);
      expect(playerAOnB?.sequence).toBe(baselineA.sequence);

      expect(playerBOnA?.tick).toBe(updateB.tick);
      expect(playerBOnA?.sequence).toBe(updateB.sequence);
    });
  });
});
