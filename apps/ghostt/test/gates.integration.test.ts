import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, type Room } from "@colyseus/sdk";
import type { Server } from "colyseus";
import type { GameState } from "../shared/game-state";
import {
  AUTH_UPDATE_MESSAGE,
  GATE_ACCESS_MESSAGE,
  GATE_DENIED_MESSAGE,
  PLAYER_UPDATE_MESSAGE,
  type GateAccessMessage,
  type GateDeniedMessage,
} from "../shared/messages";

/**
 * Token gates enforced by the real Colyseus room: dev auth mode (no Privy),
 * the dev user checked as ALICE, holdings from a temp `holdings.json`, and a
 * gate in a temp chunk file.
 */

const ALICE = "cosmos1alicetestaddress";
const PORT = 2600 + Math.floor(Math.random() * 300);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ghostt-gates-"));
const holdingsFile = path.join(tmp, "holdings.json");

let server: Server;
let room: Room<any, GameState>;

const accessUpdates: GateAccessMessage[] = [];
const denials: GateDeniedMessage[] = [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until<T>(read: () => T | undefined, timeout = 5000): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = read();
    if (value !== undefined) return value;
    await sleep(25);
  }
  throw new Error("Timed out waiting");
}

function move(x: number, y = 0, z = 0) {
  room.send(PLAYER_UPDATE_MESSAGE, { x, y, z, rotY: 0, anim: "idle" });
}

function me() {
  return room.state.players.get(room.sessionId)!;
}

beforeAll(async () => {
  fs.mkdirSync(path.join(tmp, "chunks"));
  fs.writeFileSync(
    path.join(tmp, "chunks", "0_0_0.json"),
    JSON.stringify({
      id: "0_0_0",
      assets: {
        "gate-1": {
          id: "gate-1",
          type: "token-gate",
          position: { x: 10, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 4, y: 4, z: 4 },
          requirementType: "cft20",
          ticker: "ROIDS",
          minAmount: "100",
          exitOffset: { x: -6, y: 0, z: 0 },
          label: "Vault",
        },
      },
    }),
  );
  fs.writeFileSync(holdingsFile, JSON.stringify({}));

  process.env.AWE_AUTH_MODE = "dev";
  process.env.AWE_DEV_COSMOS_ADDRESS = ALICE;
  process.env.AWE_HOLDINGS_FILE = holdingsFile;
  process.env.AWE_DATA_DIR = tmp;
  // Someone else owns the world, so the dev user isn't an admin who bypasses gates.
  process.env.AWE_OWNER_ID = "did:privy:someone-else";
  process.env.AWE_ACCESS_FILE = path.join(tmp, "access.json");

  // Imported after the env is set: the gate registry reads AWE_DATA_DIR.
  const { Server } = await import("colyseus");
  const { GameRoom } = await import("../server/game-room");

  server = new Server();
  server.define("game", GameRoom);
  await server.listen(PORT);

  room = await new Client(`ws://localhost:${PORT}`).joinOrCreate<GameState>("game", {
    accessToken: null,
  });
  room.onMessage(GATE_ACCESS_MESSAGE, (msg: GateAccessMessage) => accessUpdates.push(msg));
  room.onMessage(GATE_DENIED_MESSAGE, (msg: GateDeniedMessage) => denials.push(msg));
});

afterAll(async () => {
  await room?.leave();
  await server?.gracefullyShutdown(false);
  const { getGateRegistry } = await import("../server/game-room");
  getGateRegistry().close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("token gates on the game server", () => {
  it("tells a player without holdings they can't enter", async () => {
    const msg = await until(() => accessUpdates[0]);
    expect(msg.access).toEqual({ "gate-1": false });
  });

  it("accepts positions outside the gate", async () => {
    move(0);
    await until(() => (me()?.x === 0 ? true : undefined));
  });

  it("refuses a position inside the gate and sends the player to the exit", async () => {
    move(10);

    const denial = await until(() => denials[0]);
    expect(denial).toMatchObject({
      gateId: "gate-1",
      exit: { x: 4, y: 0, z: 0 },
      label: "Vault",
      requirement: "≥ 100 ROIDS",
    });

    await sleep(150);
    expect(me().x).toBe(0); // never stored, so other players never see it
  });

  it("refuses a step that skips over the gate between updates", async () => {
    await sleep(1100); // denial throttle
    move(3);
    await until(() => (me()?.x === 3 ? true : undefined));

    move(7.5); // just outside the gate's near edge (x = 8): accepted
    await until(() => (me()?.x === 7.5 ? true : undefined));

    move(12.5); // straight past the far edge (x = 12) with no update inside
    const denial = await until(() => denials[1]);
    expect(denial.gateId).toBe("gate-1");

    await sleep(150);
    expect(me().x).toBe(7.5);
  });

  it("doesn't mistake a long teleport for walking through", async () => {
    move(30); // a portal-style jump that flies over the gate: allowed
    await until(() => (me()?.x === 30 ? true : undefined));
  });

  it("lets the player in once they hold enough", async () => {
    fs.writeFileSync(holdingsFile, JSON.stringify({ [ALICE]: { cft20: { ROIDS: "250" } } }));
    room.send(AUTH_UPDATE_MESSAGE, { accessToken: null });

    const granted = await until(() =>
      accessUpdates.find((m) => m.access["gate-1"] === true),
    );
    expect(granted.access).toEqual({ "gate-1": true });

    move(10);
    await until(() => (me()?.x === 10 ? true : undefined));
  });
});
