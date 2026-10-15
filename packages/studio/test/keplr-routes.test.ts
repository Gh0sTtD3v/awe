import { generateKeyPairSync } from "node:crypto";
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { createLocalJWKSet, jwtVerify } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { keplrJwks, keplrNonce, keplrVerify } from "../src/keplr-routes";
import { adr36SignDoc, pubKeyToAddress, resetKeplrKeysForTests } from "../src/server/keplr-auth";

const post = (body: unknown) =>
  new Request("http://test/api", { method: "POST", body: JSON.stringify(body) });

const savedEnv = { ...process.env };

beforeEach(() => {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  process.env.KEPLR_AUTH_SECRET = "test-secret";
  process.env.KEPLR_JWT_PRIVATE_KEY = privateKey.export({ format: "pem", type: "pkcs8" }).toString();
  resetKeplrKeysForTests();
});

afterEach(() => {
  process.env = { ...savedEnv };
  resetKeplrKeysForTests();
});

describe("keplr routes", () => {
  it("runs the full nonce → sign → verify flow and issues a JWT the JWKS verifies", async () => {
    const priv = secp256k1.utils.randomPrivateKey();
    const pub = secp256k1.getPublicKey(priv, true);
    const address = pubKeyToAddress(pub);

    const nonceRes = await keplrNonce(post({ address }));
    expect(nonceRes.status).toBe(200);
    const { nonce, message } = await nonceRes.json();

    const digest = sha256(new TextEncoder().encode(adr36SignDoc(address, message)));
    const signature = Buffer.from(secp256k1.sign(digest, priv).toCompactRawBytes()).toString("base64");
    const pubKey = Buffer.from(pub).toString("base64");

    const verifyRes = await keplrVerify(post({ address, nonce, pubKey, signature }));
    expect(verifyRes.status).toBe(200);
    const { jwt } = await verifyRes.json();

    const jwks = createLocalJWKSet(await (await keplrJwks()).json());
    const { payload } = await jwtVerify(jwt, jwks);
    expect(payload.sub).toBe(address);
  });

  it("rejects bad input", async () => {
    expect((await keplrNonce(post({ address: "0xabc" }))).status).toBe(400);
    expect((await keplrNonce(new Request("http://test", { method: "POST", body: "{" }))).status).toBe(400);
    expect((await keplrVerify(post({ address: "x" }))).status).toBe(401);
  });

  it("returns 503 when not configured", async () => {
    delete process.env.KEPLR_AUTH_SECRET;
    expect((await keplrJwks()).status).toBe(503);
    expect((await keplrNonce(post({ address: "x" }))).status).toBe(503);
  });
});
