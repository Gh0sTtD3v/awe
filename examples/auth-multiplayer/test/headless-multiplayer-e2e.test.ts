import net from "node:net";
import { once } from "node:events";
import { spawn, type ChildProcess } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

interface HeadlessClientConfig {
  port: number;
  name: string;
  expectedPlayers: number;
  tape: Array<{
    moveX?: number;
    moveY?: number;
    sprint?: boolean;
    jumpPressed?: boolean;
    jumpReleased?: boolean;
    jumpHeld?: boolean;
    yaw?: number;
  }>;
  settleTicks?: number;
}

interface HeadlessClientResult {
  name: string;
  sessionId: string;
  correctionCount: number;
  pendingCommands: number;
  lastAcknowledgedSequence: number;
  predictedState: {
    position: { x: number; y: number; z: number };
    sequence: number;
  };
  authoritativeSnapshot: {
    position: { x: number; y: number; z: number };
    sequence: number;
  } | null;
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const exampleRoot = resolve(__dirname, "..");
const testServerPath = resolve(exampleRoot, "test/support/test-server.ts");
const headlessClientPath = resolve(
  exampleRoot,
  "test/support/headless-client-runner.ts",
);
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

let port = 0;
let serverProcess: ChildProcess | null = null;

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

    const handleOutput = (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes(readyText)) {
        settled = true;
        clearTimeout(timeout);
        child.stdout?.off("data", handleOutput);
        child.stderr?.off("data", handleOutput);
        resolvePromise(child);
      }
    };

    child.stdout?.on("data", handleOutput);
    child.stderr?.on("data", handleOutput);

    child.once("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rejectPromise(
        new Error(`Test server exited early with code ${code}.\n${output}`),
      );
    });

    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rejectPromise(error);
    });
  });
}

async function stopServer(child: ChildProcess | null): Promise<void> {
  if (!child || child.exitCode !== null) return;

  child.kill("SIGTERM");
  await once(child, "exit");
}

function repeat(
  count: number,
  frame: HeadlessClientConfig["tape"][number],
): HeadlessClientConfig["tape"] {
  return Array.from({ length: count }, () => ({ ...frame }));
}

function buildTapeA(): HeadlessClientConfig["tape"] {
  return [
    ...repeat(18, { moveY: 1, yaw: 0 }),
    ...repeat(8, { moveY: 1, sprint: true, yaw: 0 }),
    { moveY: 1, sprint: true, jumpPressed: true, jumpHeld: true, yaw: 0 },
    ...repeat(6, { moveY: 1, sprint: true, jumpHeld: true, yaw: 0 }),
    { moveY: 1, sprint: true, jumpReleased: true, yaw: 0 },
    ...repeat(14, { moveX: 1, sprint: true, yaw: Math.PI / 2 }),
    ...repeat(8, {}),
  ];
}

function buildTapeB(): HeadlessClientConfig["tape"] {
  return [
    ...repeat(14, { moveX: -1, yaw: Math.PI / 4 }),
    ...repeat(10, { moveY: 1, yaw: Math.PI / 2 }),
    { moveY: 1, jumpPressed: true, jumpHeld: true, yaw: Math.PI / 2 },
    ...repeat(5, { moveY: 1, jumpHeld: true, yaw: Math.PI / 2 }),
    { moveY: 1, jumpReleased: true, yaw: Math.PI / 2 },
    ...repeat(14, { moveX: -1, moveY: 1, sprint: true, yaw: Math.PI / 2 }),
    ...repeat(11, {}),
  ];
}

function distance3(
  left: { x: number; y: number; z: number },
  right: { x: number; y: number; z: number },
): number {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  const dz = left.z - right.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

async function runHeadlessClient(
  config: HeadlessClientConfig,
): Promise<HeadlessClientResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      pnpmCommand,
      ["exec", "tsx", headlessClientPath, JSON.stringify(config)],
      {
        cwd: exampleRoot,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      rejectPromise(
        new Error(
          `Timed out running headless client ${config.name}.\nstdout:\n${stdout}\nstderr:\n${stderr}`,
        ),
      );
    }, 20000);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.once("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      if (code !== 0) {
        rejectPromise(
          new Error(
            `Headless client ${config.name} exited with code ${code}.\nstdout:\n${stdout}\nstderr:\n${stderr}`,
          ),
        );
        return;
      }

      const resultLine = stdout
        .split("\n")
        .find((line) => line.startsWith("__RESULT__"));

      if (!resultLine) {
        rejectPromise(
          new Error(
            `Headless client ${config.name} did not produce a result.\nstdout:\n${stdout}\nstderr:\n${stderr}`,
          ),
        );
        return;
      }

      resolvePromise(
        JSON.parse(resultLine.slice("__RESULT__".length)) as HeadlessClientResult,
      );
    });

    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rejectPromise(error);
    });
  });
}

describe("headless multiplayer e2e", () => {
  beforeAll(async () => {
    port = await getFreePort();
    serverProcess = await startServer();
  });

  afterAll(async () => {
    await stopServer(serverProcess);
  });

  it("keeps headless predicted clients aligned with authoritative server state", async () => {
    const [clientA, clientB] = await Promise.all([
      runHeadlessClient({
        port,
        name: "client-a",
        expectedPlayers: 2,
        tape: buildTapeA(),
      }),
      runHeadlessClient({
        port,
        name: "client-b",
        expectedPlayers: 2,
        tape: buildTapeB(),
      }),
    ]);

    expect(clientA.authoritativeSnapshot).toBeTruthy();
    expect(clientB.authoritativeSnapshot).toBeTruthy();
    expect(clientA.pendingCommands).toBe(0);
    expect(clientB.pendingCommands).toBe(0);
    expect(clientA.lastAcknowledgedSequence).toBe(
      clientA.authoritativeSnapshot!.sequence,
    );
    expect(clientB.lastAcknowledgedSequence).toBe(
      clientB.authoritativeSnapshot!.sequence,
    );

    expect(
      distance3(
        clientA.predictedState.mover.position,
        clientA.authoritativeSnapshot!.mover.position,
      ),
    ).toBeLessThan(0.02);
    expect(
      distance3(
        clientB.predictedState.mover.position,
        clientB.authoritativeSnapshot!.mover.position,
      ),
    ).toBeLessThan(0.02);

    expect(clientA.roomPlayers).toHaveLength(2);
    expect(clientB.roomPlayers).toHaveLength(2);

    const playerAOnA = clientA.roomPlayers.find(
      ({ sessionId }) => sessionId === clientA.sessionId,
    );
    const playerBOnA = clientA.roomPlayers.find(
      ({ sessionId }) => sessionId === clientB.sessionId,
    );
    const playerAOnB = clientB.roomPlayers.find(
      ({ sessionId }) => sessionId === clientA.sessionId,
    );
    const playerBOnB = clientB.roomPlayers.find(
      ({ sessionId }) => sessionId === clientB.sessionId,
    );

    expect(playerAOnA).toBeDefined();
    expect(playerBOnA).toBeDefined();
    expect(playerAOnB).toBeDefined();
    expect(playerBOnB).toBeDefined();

    expect(
      distance3(playerAOnA!, clientA.authoritativeSnapshot!.mover.position),
    ).toBeLessThan(0.02);
    expect(
      distance3(playerBOnB!, clientB.authoritativeSnapshot!.mover.position),
    ).toBeLessThan(0.02);

    expect(clientA.remoteComponents[clientB.sessionId]).toBeDefined();
    expect(clientB.remoteComponents[clientA.sessionId]).toBeDefined();

    expect(
      distance3(clientA.remoteComponents[clientB.sessionId], playerBOnA!),
    ).toBeLessThan(0.6);
    expect(
      distance3(clientB.remoteComponents[clientA.sessionId], playerAOnB!),
    ).toBeLessThan(0.6);
  });
});
