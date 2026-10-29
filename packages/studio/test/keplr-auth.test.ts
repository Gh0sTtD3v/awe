import { generateKeyPairSync } from "node:crypto";
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { createLocalJWKSet, jwtVerify } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adr36SignDoc,
  challengeMessage,
  createChallenge,
  getJwks,
  isCosmosAddress,
  issueJwt,
  pubKeyToAddress,
  resetKeplrKeysForTests,
  verifyKeplrSignature,
} from "../src/server/keplr-auth";

/** A fake Keplr: signs exactly what `signArbitrary` would. */
function makeWallet() {
  const privateKey = secp256k1.utils.randomPrivateKey();
  const pubKeyBytes = secp256k1.getPublicKey(privateKey, true);
  const address = pubKeyToAddress(pubKeyBytes);

  const signArbitrary = (signer: string, message: string) => {
    const digest = sha256(new TextEncoder().encode(adr36SignDoc(signer, message)));
    const sig = secp256k1.sign(digest, privateKey).toCompactRawBytes();
    return {
      pubKey: Buffer.from(pubKeyBytes).toString("base64"),
      signature: Buffer.from(sig).toString("base64"),
    };
  };

  return { address, signArbitrary };
}

const savedEnv = { ...process.env };

beforeEach(() => {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  process.env.KEPLR_AUTH_SECRET = "test-secret";
  process.env.KEPLR_JWT_PRIVATE_KEY = privateKey
    .export({ format: "pem", type: "pkcs8" })
    .toString()
    .replace(/\n/g, "\\n");
  resetKeplrKeysForTests();
});

afterEach(() => {
  process.env = { ...savedEnv };
  resetKeplrKeysForTests();
});

describe("keplr signature verification", () => {
  it("accepts a valid signArbitrary signature over the challenge", () => {
    const wallet = makeWallet();
    const { nonce, message } = createChallenge(wallet.address);

    const signed = wallet.signArbitrary(wallet.address, message);

    expect(verifyKeplrSignature({ address: wallet.address, nonce, ...signed })).toBe(true);
  });

  it("rejects a nonce issued for a different address", () => {
    const alice = makeWallet();
    const mallory = makeWallet();
    const { nonce } = createChallenge(alice.address);

    const signed = mallory.signArbitrary(mallory.address, challengeMessage(nonce));

    expect(verifyKeplrSignature({ address: mallory.address, nonce, ...signed })).toBe(false);
  });

  it("rejects an expired nonce", () => {
    const wallet = makeWallet();
    const issuedAt = Date.now() - 10 * 60 * 1000;
    const { nonce, message } = createChallenge(wallet.address, issuedAt);

    const signed = wallet.signArbitrary(wallet.address, message);

    expect(verifyKeplrSignature({ address: wallet.address, nonce, ...signed })).toBe(false);
  });

  it("rejects a tampered nonce", () => {
    const wallet = makeWallet();
    const { nonce } = createChallenge(wallet.address);
    const tampered = nonce.replace(/\.(\d+)\./, (_, exp) => `.${Number(exp) + 1_000_000}.`);

    const signed = wallet.signArbitrary(wallet.address, challengeMessage(tampered));

    expect(verifyKeplrSignature({ address: wallet.address, nonce: tampered, ...signed })).toBe(false);
  });

  it("rejects a public key that doesn't match the address", () => {
    const alice = makeWallet();
    const mallory = makeWallet();
    const { nonce, message } = createChallenge(alice.address);

    // Mallory signs the right doc, but with her own key.
    const signed = mallory.signArbitrary(alice.address, message);

    expect(verifyKeplrSignature({ address: alice.address, nonce, ...signed })).toBe(false);
  });

  it("rejects a signature over a different message", () => {
    const wallet = makeWallet();
    const { nonce } = createChallenge(wallet.address);

    const signed = wallet.signArbitrary(wallet.address, "something else");

    expect(verifyKeplrSignature({ address: wallet.address, nonce, ...signed })).toBe(false);
  });

  it("returns false rather than throwing on garbage", () => {
    expect(
      verifyKeplrSignature({ address: "nope", nonce: "x", pubKey: "!!", signature: "??" }),
    ).toBe(false);
  });
});

describe("cosmos addresses", () => {
  it("validates bech32 cosmos addresses", () => {
    expect(isCosmosAddress(makeWallet().address)).toBe(true);
    expect(isCosmosAddress("osmo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq")).toBe(false);
    expect(isCosmosAddress("0x1234")).toBe(false);
  });
});

describe("keplr jwt", () => {
  it("issues a JWT that verifies against the published JWKS", async () => {
    const { address } = makeWallet();

    const token = await issueJwt(address);
    const jwks = createLocalJWKSet(await getJwks());
    const { payload, protectedHeader } = await jwtVerify(token, jwks, {
      issuer: "awe-keplr",
      audience: "awe-keplr",
    });

    expect(payload.sub).toBe(address);
    expect(protectedHeader.alg).toBe("ES256");
    expect(payload.exp! - payload.iat!).toBe(600);
  });

  it("signs RS256 with an RSA key, which Privy needs for a pasted certificate", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    process.env.KEPLR_JWT_PRIVATE_KEY = privateKey.export({ format: "pem", type: "pkcs8" }).toString();
    resetKeplrKeysForTests();

    const { address } = makeWallet();
    const token = await issueJwt(address);
    const jwks = await getJwks();
    const { payload, protectedHeader } = await jwtVerify(token, createLocalJWKSet(jwks), {
      issuer: "awe-keplr",
      audience: "awe-keplr",
    });

    expect(payload.sub).toBe(address);
    expect(protectedHeader.alg).toBe("RS256");
    expect(jwks.keys[0]).toMatchObject({ kty: "RSA", alg: "RS256" });
    expect(jwks.keys[0]).not.toHaveProperty("d");
  });

  it("publishes only the public key", async () => {
    const { keys } = await getJwks();
    expect(keys).toHaveLength(1);
    expect(keys[0]).not.toHaveProperty("d");
    expect(keys[0].kid).toBeTruthy();
  });
});
