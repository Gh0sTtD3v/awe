/**
 * Server-side only — reads `KEPLR_AUTH_SECRET` and `KEPLR_JWT_PRIVATE_KEY`.
 *
 * Sign-in with Keplr, bridged into Privy's custom (JWT-based) auth:
 *
 *   1. The client asks for a nonce for its Cosmos address ({@link createChallenge}).
 *   2. Keplr signs the challenge message with `signArbitrary` (ADR-036).
 *   3. We check the signature ({@link verifyKeplrSignature}) and mint a short-lived
 *      JWT whose `sub` is the address ({@link issueJwt}).
 *   4. Privy verifies that JWT against our JWKS ({@link getJwks}) and turns it into
 *      a normal Privy session with a `custom_auth` linked account.
 *
 * From step 4 onwards the user is an ordinary Privy user — the access token the
 * rest of the server verifies is Privy's, not ours.
 */

import {
  createHmac,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  type KeyObject,
} from "node:crypto";
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { ripemd160 } from "@noble/hashes/ripemd160";
import { bech32 } from "@scure/base";
import { SignJWT, calculateJwkThumbprint, type JWK } from "jose";

export const COSMOS_PREFIX = "cosmos";

const NONCE_TTL_MS = 5 * 60 * 1000;
const JWT_TTL_SECONDS = 10 * 60;

export interface KeplrChallenge {
  nonce: string;
  /** The exact text the wallet must sign. */
  message: string;
}

export interface KeplrSignatureInput {
  address: string;
  nonce: string;
  /** From `signArbitrary`: `pub_key.value`, base64 compressed secp256k1 key. */
  pubKey: string;
  /** From `signArbitrary`: base64 64-byte r||s signature. */
  signature: string;
}

export function isKeplrAuthConfigured(): boolean {
  return !!(process.env.KEPLR_AUTH_SECRET && process.env.KEPLR_JWT_PRIVATE_KEY);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Keplr auth is not configured: set ${name}.`);
  return value;
}

// ── Challenge ────────────────────────────────────────────────────────────────

/**
 * A stateless nonce: `<address>.<expiresAt>.<random>.<hmac>`. Binding the address
 * in means a nonce issued for one wallet can't be used to sign in as another,
 * and the HMAC means we need no store to remember what we handed out.
 */
export function createChallenge(address: string, now = Date.now()): KeplrChallenge {
  if (!isCosmosAddress(address)) throw new Error("Invalid Cosmos address");

  const payload = `${address}.${now + NONCE_TTL_MS}.${randomBytes(16).toString("hex")}`;
  const nonce = `${payload}.${hmac(payload)}`;

  return { nonce, message: challengeMessage(nonce) };
}

export function challengeMessage(nonce: string): string {
  return `Sign in to ghostt with your Keplr wallet.\n\nThis request will not trigger a transaction or cost any fees.\n\nNonce: ${nonce}`;
}

function hmac(payload: string): string {
  return createHmac("sha256", requireEnv("KEPLR_AUTH_SECRET")).update(payload).digest("hex");
}

function checkNonce(nonce: string, address: string, now: number): boolean {
  const lastDot = nonce.lastIndexOf(".");
  if (lastDot === -1) return false;

  const payload = nonce.slice(0, lastDot);
  const mac = Buffer.from(nonce.slice(lastDot + 1), "hex");
  const expected = Buffer.from(hmac(payload), "hex");
  if (mac.length !== expected.length || !timingSafeEqual(mac, expected)) return false;

  const [nonceAddress, expiresAt] = payload.split(".");
  return nonceAddress === address && Number(expiresAt) > now;
}

// ── Signature ────────────────────────────────────────────────────────────────

/**
 * Verify an ADR-036 `signArbitrary` signature over our challenge. Returns false
 * for anything malformed — callers treat false as "not authenticated".
 */
export function verifyKeplrSignature(input: KeplrSignatureInput, now = Date.now()): boolean {
  try {
    const { address, nonce, pubKey, signature } = input;
    if (!isCosmosAddress(address)) return false;
    if (!checkNonce(nonce, address, now)) return false;

    const pubKeyBytes = Buffer.from(pubKey, "base64");
    if (pubKeyToAddress(pubKeyBytes) !== address) return false;

    const signDoc = adr36SignDoc(address, challengeMessage(nonce));
    const digest = sha256(new TextEncoder().encode(signDoc));

    return secp256k1.verify(Buffer.from(signature, "base64"), digest, pubKeyBytes);
  } catch {
    return false;
  }
}

/**
 * The amino JSON sign doc Keplr signs for `signArbitrary`, with keys sorted as
 * amino requires. See ADR-036.
 */
export function adr36SignDoc(signer: string, data: string): string {
  return JSON.stringify({
    account_number: "0",
    chain_id: "",
    fee: { amount: [], gas: "0" },
    memo: "",
    msgs: [
      {
        type: "sign/MsgSignData",
        value: { data: Buffer.from(data, "utf8").toString("base64"), signer },
      },
    ],
    sequence: "0",
  });
}

export function pubKeyToAddress(compressedPubKey: Uint8Array, prefix = COSMOS_PREFIX): string {
  if (compressedPubKey.length !== 33) throw new Error("Expected a compressed secp256k1 key");
  return bech32.encode(prefix, bech32.toWords(ripemd160(sha256(compressedPubKey))));
}

export function isCosmosAddress(value: unknown, prefix = COSMOS_PREFIX): value is string {
  if (typeof value !== "string") return false;
  try {
    const { prefix: decoded, words } = bech32.decode(value as `${string}1${string}`);
    return decoded === prefix && bech32.fromWords(words).length === 20;
  } catch {
    return false;
  }
}

// ── JWT ──────────────────────────────────────────────────────────────────────

let keysPromise: Promise<{ privateKey: KeyObject; jwk: JWK }> | null = null;

/**
 * ES256 key from `KEPLR_JWT_PRIVATE_KEY` (PKCS8 PEM; `\n` escapes allowed so it
 * fits on one env line). The public half is what Privy fetches from our JWKS.
 */
function getKeys() {
  if (!keysPromise) {
    keysPromise = (async () => {
      const pem = requireEnv("KEPLR_JWT_PRIVATE_KEY").replace(/\\n/g, "\n");
      const privateKey = createPrivateKey(pem);

      const jwk = createPublicKey(privateKey).export({ format: "jwk" }) as JWK;
      jwk.kid = await calculateJwkThumbprint(jwk);
      jwk.alg = "ES256";
      jwk.use = "sig";

      return { privateKey, jwk };
    })().catch((err) => {
      keysPromise = null;
      throw err;
    });
  }
  return keysPromise;
}

function issuer(): string {
  return process.env.KEPLR_JWT_ISSUER || "awe-keplr";
}

/** A JWT Privy will exchange for a session. `sub` is the Cosmos address. */
export async function issueJwt(address: string): Promise<string> {
  const { privateKey, jwk } = await getKeys();

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: jwk.kid, typ: "JWT" })
    .setSubject(address)
    .setIssuer(issuer())
    .setAudience(issuer())
    .setIssuedAt()
    .setExpirationTime(`${JWT_TTL_SECONDS}s`)
    .sign(privateKey);
}

export async function getJwks(): Promise<{ keys: JWK[] }> {
  const { jwk } = await getKeys();
  return { keys: [jwk] };
}

/** For tests: forget the cached key after changing env. */
export function resetKeplrKeysForTests(): void {
  keysPromise = null;
}
