import {
  createChallenge,
  getJwks,
  isCosmosAddress,
  isKeplrAuthConfigured,
  issueJwt,
  verifyKeplrSignature,
} from "./server/keplr-auth";

/**
 * Route handlers for sign-in with Keplr. Each host app mounts them at
 * `/api/auth/keplr/{nonce,verify,jwks}`:
 *
 *   export { keplrNonce as POST } from "@oncyberio/studio/keplr-routes";
 *
 * The JWKS URL is what goes into Privy's dashboard under JWT-based auth.
 */

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function notConfigured() {
  return json({ error: "Keplr sign-in is not configured" }, 503);
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}

/** `POST {address}` → `{nonce, message}` */
export async function keplrNonce(request: Request) {
  if (!isKeplrAuthConfigured()) return notConfigured();

  const body = await readJson(request);
  if (!isCosmosAddress(body?.address)) {
    return json({ error: "Invalid Cosmos address" }, 400);
  }

  return json(createChallenge(body.address), 200, { "cache-control": "no-store" });
}

/** `POST {address, nonce, pubKey, signature}` → `{jwt}` */
export async function keplrVerify(request: Request) {
  if (!isKeplrAuthConfigured()) return notConfigured();

  const body = await readJson(request);
  const { address, nonce, pubKey, signature } = body ?? {};

  if (
    typeof address !== "string" ||
    typeof nonce !== "string" ||
    typeof pubKey !== "string" ||
    typeof signature !== "string" ||
    !verifyKeplrSignature({ address, nonce, pubKey, signature })
  ) {
    return json({ error: "Invalid signature" }, 401);
  }

  return json({ jwt: await issueJwt(address) }, 200, { "cache-control": "no-store" });
}

/** `GET` → JWKS, fetched by Privy to verify our JWTs. */
export async function keplrJwks() {
  if (!isKeplrAuthConfigured()) return notConfigured();

  return json(await getJwks(), 200, { "cache-control": "public, max-age=300" });
}
