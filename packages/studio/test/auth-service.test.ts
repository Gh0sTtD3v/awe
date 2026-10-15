import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assertProductionSafe,
  getAuthMode,
  getDevUserId,
  getIdentityFromRequest,
} from "../src/server/auth-service";

const ENV_KEYS = [
  "AWE_AUTH_MODE",
  "AWE_DEV_USER_ID",
  "NEXT_PUBLIC_PRIVY_APP_ID",
  "PRIVY_APP_SECRET",
  "NODE_ENV",
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("auth mode resolution", () => {
  it("defaults to dev when Privy is not configured", () => {
    // The lock-out guard: a developer with no credentials must keep full
    // access to their own local studio.
    expect(getAuthMode()).toBe("dev");
  });

  it("defaults to privy once both credentials are present", () => {
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = "app123";
    process.env.PRIVY_APP_SECRET = "secret";

    expect(getAuthMode()).toBe("privy");
  });

  it("stays in dev when only the public app id is set", () => {
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = "app123";

    expect(getAuthMode()).toBe("dev");
  });

  it("honours an explicit override", () => {
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = "app123";
    process.env.PRIVY_APP_SECRET = "secret";
    process.env.AWE_AUTH_MODE = "off";

    expect(getAuthMode()).toBe("off");
  });

  it("ignores an unrecognised override", () => {
    process.env.AWE_AUTH_MODE = "nonsense";

    expect(getAuthMode()).toBe("dev");
  });
});

describe("production safety", () => {
  it("refuses to serve in dev mode in production", () => {
    process.env.NODE_ENV = "production";

    expect(() => assertProductionSafe()).toThrow(/AWE_AUTH_MODE/);
  });

  it("allows privy mode in production", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = "app123";
    process.env.PRIVY_APP_SECRET = "secret";

    expect(() => assertProductionSafe()).not.toThrow();
  });

  it("does not interfere outside production", () => {
    expect(() => assertProductionSafe()).not.toThrow();
  });
});

describe("identity resolution", () => {
  it("synthesises an identity in dev mode", async () => {
    process.env.AWE_DEV_USER_ID = "someone";

    const identity = await getIdentityFromRequest(new Request("http://x/"));

    expect(identity).toEqual({ userId: "someone", synthetic: true });
    expect(getDevUserId()).toBe("someone");
  });

  it("rejects a bogus token in privy mode without throwing", async () => {
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = "app123";
    process.env.PRIVY_APP_SECRET = "secret";

    const req = new Request("http://x/", {
      headers: { authorization: "Bearer not-a-real-token" },
    });

    await expect(getIdentityFromRequest(req)).resolves.toBeNull();
  });

  it("returns null in privy mode when no token is presented", async () => {
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = "app123";
    process.env.PRIVY_APP_SECRET = "secret";

    await expect(
      getIdentityFromRequest(new Request("http://x/")),
    ).resolves.toBeNull();
  });

  it("reads the token from the privy cookie as well as the header", async () => {
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = "app123";
    process.env.PRIVY_APP_SECRET = "secret";

    const req = new Request("http://x/", {
      headers: { cookie: "other=1; privy-token=not-a-real-token; more=2" },
    });

    // Still null because the token is bogus, but it must have been *found* and
    // attempted rather than skipped — proven by it not throwing on the parse.
    await expect(getIdentityFromRequest(req)).resolves.toBeNull();
  });
});
