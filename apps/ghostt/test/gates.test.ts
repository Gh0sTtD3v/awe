import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  describeRequirement,
  gateFromComponent,
  pointInGate,
  segmentHitsGate,
} from "../shared/gates";
import { loadGates } from "../server/gate-registry";
import { parseEnv } from "../server/load-env";

const gateComponent = (overrides: Record<string, unknown> = {}) => ({
  id: "gate-1",
  type: "token-gate",
  position: { x: 10, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 4, y: 2, z: 2 },
  requirementType: "cft20",
  ticker: "roids",
  minAmount: "100",
  exitOffset: { x: 0, y: 0, z: 5 },
  doorTag: "vault-door",
  label: "Vault",
  ...overrides,
});

describe("gateFromComponent", () => {
  it("builds a gate from stored component data", () => {
    const gate = gateFromComponent(gateComponent())!;

    expect(gate.id).toBe("gate-1");
    expect(gate.halfSize).toEqual({ x: 2, y: 1, z: 1 });
    expect(gate.exit).toEqual({ x: 10, y: 0, z: 5 });
    expect(gate.requirement).toEqual({ type: "cft20", chain: "cosmos", ticker: "ROIDS", minAmount: "100" });
    expect(gate.doorTag).toBe("vault-door");
    expect(gate.label).toBe("Vault");
  });

  it("reads inscription requirements", () => {
    const gate = gateFromComponent(
      gateComponent({ requirementType: "inscription", collection: "astro-cats" }),
    )!;
    expect(gate.requirement).toEqual({ type: "inscription", chain: "cosmos", collection: "astro-cats", minAmount: "100" });
    expect(describeRequirement(gate.requirement)).toBe("an inscription from astro-cats");
  });

  const CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

  it("reads EVM token requirements", () => {
    const gate = gateFromComponent(
      gateComponent({ chain: "base", requirementType: "erc20", contract: CONTRACT, ticker: "USDC", minAmount: "5" }),
    )!;
    expect(gate.requirement).toEqual({
      type: "erc20",
      chain: "base",
      contract: CONTRACT.toLowerCase(),
      ticker: "USDC",
      minAmount: "5",
    });
    expect(describeRequirement(gate.requirement)).toBe("≥ 5 USDC on Base");
  });

  it("reads EVM NFT requirements, with an optional ERC-1155 token id", () => {
    const erc721 = gateFromComponent(gateComponent({ chain: "ethereum", requirementType: "nft", contract: CONTRACT }))!;
    expect(erc721.requirement).toEqual({ type: "nft", chain: "ethereum", contract: CONTRACT.toLowerCase(), minAmount: "1" });
    expect(describeRequirement(erc721.requirement)).toBe("an NFT from 0xa0b8…eb48 on Ethereum");

    const erc1155 = gateFromComponent(
      gateComponent({ chain: "polygon", requirementType: "nft", contract: CONTRACT, tokenId: "7" }),
    )!;
    expect(erc1155.requirement.tokenId).toBe("7");
    expect(describeRequirement(erc1155.requirement)).toBe("an NFT from 0xa0b8…eb48 (token #7) on Polygon");
  });

  it("maps a Cosmos kind onto the EVM one when only the chain changed", () => {
    expect(gateFromComponent(gateComponent({ chain: "base", contract: CONTRACT }))!.requirement.type).toBe("erc20");
    expect(
      gateFromComponent(gateComponent({ chain: "base", requirementType: "inscription", contract: CONTRACT }))!.requirement.type,
    ).toBe("nft");
  });

  it("ignores non-gates and half-configured gates", () => {
    expect(gateFromComponent({ id: "x", type: "portal" })).toBeNull();
    expect(gateFromComponent(gateComponent({ ticker: "" }))).toBeNull();
    expect(gateFromComponent(gateComponent({ requirementType: "inscription", collection: " " }))).toBeNull();
    expect(gateFromComponent(null)).toBeNull();
    expect(gateFromComponent(gateComponent({ chain: "base", contract: "" }))).toBeNull();
    expect(gateFromComponent(gateComponent({ chain: "base", contract: "0x123" }))).toBeNull();
    expect(
      gateFromComponent(gateComponent({ chain: "solana", contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" })),
    ).toBeNull();
  });
});

describe("pointInGate", () => {
  const gate = gateFromComponent(gateComponent())!;

  it("detects points inside, on the edge and outside", () => {
    expect(pointInGate(gate, { x: 10, y: 0, z: 0 })).toBe(true);
    expect(pointInGate(gate, { x: 12, y: 1, z: 1 })).toBe(true); // corner
    expect(pointInGate(gate, { x: 12.01, y: 0, z: 0 })).toBe(false);
    expect(pointInGate(gate, gate.exit)).toBe(false);
  });

  it("respects rotation", () => {
    // Long axis (x, half 2) turned to lie along z.
    const rotated = gateFromComponent(gateComponent({ rotation: { x: 0, y: Math.PI / 2, z: 0 } }))!;
    expect(pointInGate(rotated, { x: 10, y: 0, z: 1.9 })).toBe(true);
    expect(pointInGate(rotated, { x: 11.9, y: 0, z: 0 })).toBe(false);
  });
});

describe("segmentHitsGate", () => {
  const gate = gateFromComponent(gateComponent())!;

  it("catches a move that jumps over the gate", () => {
    expect(segmentHitsGate(gate, { x: 5, y: 0, z: 0 }, { x: 15, y: 0, z: 0 })).toBe(true);
  });

  it("ignores moves that pass beside it", () => {
    expect(segmentHitsGate(gate, { x: 5, y: 0, z: 3 }, { x: 15, y: 0, z: 3 })).toBe(false);
    expect(segmentHitsGate(gate, { x: 0, y: 0, z: 0 }, { x: 7, y: 0, z: 0 })).toBe(false);
  });
});

describe("loadGates", () => {
  it("collects gates from the static scene and chunk files", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gates-"));
    fs.mkdirSync(path.join(dir, "chunks"));
    fs.writeFileSync(
      path.join(dir, "static-scene.json"),
      JSON.stringify({ components: { a: gateComponent({ id: "scene-gate" }) } }),
    );
    fs.writeFileSync(
      path.join(dir, "chunks", "0_0_0.json"),
      JSON.stringify({ assets: { b: gateComponent({ id: "chunk-gate" }), c: { id: "m", type: "mesh" } } }),
    );
    fs.writeFileSync(path.join(dir, "chunks", "broken.json"), "{ nope");

    const ids = loadGates(dir).map((g) => g.id).sort();
    expect(ids).toEqual(["chunk-gate", "scene-gate"]);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("parseEnv", () => {
  it("handles plain, quoted and escaped values", () => {
    const env = parseEnv(
      [
        "# comment",
        "PLAIN=hello # trailing",
        'QUOTED="a b"',
        'PEM="line1\\nline2"',
        "SINGLE='keep \\n raw'",
        "EMPTY=",
        "export EXPORTED=1",
      ].join("\r\n"),
    );

    expect(env).toEqual({
      PLAIN: "hello",
      QUOTED: "a b",
      PEM: "line1\nline2",
      SINGLE: "keep \\n raw",
      EMPTY: "",
      EXPORTED: "1",
    });
  });
});
