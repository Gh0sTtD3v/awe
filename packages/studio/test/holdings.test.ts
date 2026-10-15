import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AsteroidHoldingsProvider,
  StubHoldingsProvider,
  addressMeetsRequirement,
  setHoldingsProvider,
  toBaseUnits,
  type HoldingsProvider,
} from "../src/server/holdings";
import { cosmosAddressOf, identifyAccessToken } from "../src/server-gating";

const ALICE = "cosmos1alice";
const BOB = "cosmos1bob";

describe("toBaseUnits", () => {
  it("converts display units without floating point", () => {
    expect(toBaseUnits("1", 6)).toBe(1_000_000n);
    expect(toBaseUnits("1.5", 6)).toBe(1_500_000n);
    expect(toBaseUnits(".25", 2)).toBe(25n);
    expect(toBaseUnits("0.1234567", 6)).toBe(123_456n); // truncates
    expect(toBaseUnits("100", 0)).toBe(100n);
  });

  it("rejects garbage", () => {
    expect(() => toBaseUnits("abc", 6)).toThrow();
    expect(() => toBaseUnits("", 6)).toThrow();
    expect(() => toBaseUnits("-1", 6)).toThrow();
  });
});

describe("StubHoldingsProvider", () => {
  let file: string;

  beforeEach(() => {
    file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "holdings-")), "holdings.json");
    fs.writeFileSync(
      file,
      JSON.stringify({
        [ALICE]: { cft20: { roids: "150.5" }, inscriptions: ["astro-cats"] },
      }),
    );
  });

  it("compares CFT-20 balances against the minimum, case-insensitively", async () => {
    const stub = new StubHoldingsProvider(file);
    expect(await stub.meets(ALICE, { type: "cft20", ticker: "ROIDS", minAmount: "150.5" })).toBe(true);
    expect(await stub.meets(ALICE, { type: "cft20", ticker: "ROIDS", minAmount: "150.51" })).toBe(false);
    expect(await stub.meets(ALICE, { type: "cft20", ticker: "OTHER", minAmount: "1" })).toBe(false);
  });

  it("checks inscription collections", async () => {
    const stub = new StubHoldingsProvider(file);
    expect(await stub.meets(ALICE, { type: "inscription", collection: "astro-cats", minAmount: "1" })).toBe(true);
    expect(await stub.meets(ALICE, { type: "inscription", collection: "dogs", minAmount: "1" })).toBe(false);
  });

  it("denies unknown addresses and a missing file", async () => {
    expect(await new StubHoldingsProvider(file).meets(BOB, { type: "cft20", ticker: "ROIDS", minAmount: "1" })).toBe(false);
    expect(
      await new StubHoldingsProvider(file + ".missing").meets(ALICE, { type: "cft20", ticker: "ROIDS", minAmount: "1" }),
    ).toBe(false);
  });
});

describe("addressMeetsRequirement", () => {
  const req = { type: "cft20" as const, ticker: "ROIDS", minAmount: "1" };

  afterEach(() => setHoldingsProvider(null));

  it("caches answers for a minute", async () => {
    const meets = vi.fn(async () => true);
    setHoldingsProvider({ name: "fake", meets });

    expect(await addressMeetsRequirement(ALICE, req, 0)).toBe(true);
    expect(await addressMeetsRequirement(ALICE, req, 30_000)).toBe(true);
    expect(meets).toHaveBeenCalledTimes(1);

    await addressMeetsRequirement(ALICE, req, 61_000);
    expect(meets).toHaveBeenCalledTimes(2);
  });

  it("fails closed, and doesn't cache failures", async () => {
    const meets = vi
      .fn<HoldingsProvider["meets"]>()
      .mockRejectedValueOnce(new Error("indexer down"))
      .mockResolvedValueOnce(true);
    setHoldingsProvider({ name: "flaky", meets });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(await addressMeetsRequirement(ALICE, req, 0)).toBe(false);
    expect(await addressMeetsRequirement(ALICE, req, 1)).toBe(true);
  });

  it("denies a missing address without asking the provider", async () => {
    const meets = vi.fn(async () => true);
    setHoldingsProvider({ name: "fake", meets });

    expect(await addressMeetsRequirement(null, req)).toBe(false);
    expect(meets).not.toHaveBeenCalled();
  });
});

describe("AsteroidHoldingsProvider", () => {
  const respond = (data: unknown) =>
    vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify({ data })));

  it("compares token_holder amounts in base units using token decimals", async () => {
    const fetchImpl = respond({ token_holder: [{ amount: "150000000", token: { decimals: 6 } }] });
    const provider = new AsteroidHoldingsProvider("https://indexer.test/v1/graphql", fetchImpl as any);

    expect(await provider.meets(ALICE, { type: "cft20", ticker: "ROIDS", minAmount: "150" })).toBe(true);
    expect(await provider.meets(ALICE, { type: "cft20", ticker: "ROIDS", minAmount: "150.000001" })).toBe(false);

    const body = JSON.parse(fetchImpl.mock.calls[0][1].body as string);
    expect(body.query).toContain("token_holder");
    expect(body.variables).toEqual({ address: ALICE, ticker: "ROIDS" });
  });

  it("checks inscription ownership", async () => {
    const owned = new AsteroidHoldingsProvider("u", respond({ inscription: [{ id: 1 }] }) as any);
    const none = new AsteroidHoldingsProvider("u", respond({ inscription: [] }) as any);
    const req = { type: "inscription" as const, collection: "astro-cats", minAmount: "1" };

    expect(await owned.meets(ALICE, req)).toBe(true);
    expect(await none.meets(ALICE, req)).toBe(false);
  });

  it("throws on GraphQL errors so callers fail closed", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ errors: [{ message: "field not found" }] })));
    const provider = new AsteroidHoldingsProvider("u", fetchImpl as any);
    await expect(provider.meets(ALICE, { type: "cft20", ticker: "X", minAmount: "1" })).rejects.toThrow(
      "field not found",
    );
  });
});

describe("server-gating identity", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("uses the dev user and AWE_DEV_COSMOS_ADDRESS when auth isn't configured", async () => {
    process.env.AWE_AUTH_MODE = "dev";
    process.env.AWE_DEV_USER_ID = "dev-owner";
    process.env.AWE_DEV_COSMOS_ADDRESS = ALICE;

    const identity = await identifyAccessToken(null);
    expect(identity).toEqual({ userId: "dev-owner", synthetic: true });
    expect(await cosmosAddressOf(identity)).toBe(ALICE);
  });

  it("treats a missing token as anonymous in privy mode", async () => {
    process.env.AWE_AUTH_MODE = "privy";
    expect(await identifyAccessToken(null)).toBeNull();
    expect(await cosmosAddressOf(null)).toBeNull();
  });
});
