import { isPrivyConfigured, verifyToken } from "./privy-adapter";

/**
 * Resolves the caller's identity for server actions and route handlers.
 *
 * Server-side only. Reachable from the client only through `"use server"`
 * actions, which must call {@link requireIdentity} before doing anything a
 * permission could deny.
 */

export type AuthMode = "privy" | "dev" | "off";

export interface Identity {
  /** Privy DID in `privy` mode; a synthetic id otherwise. */
  userId: string;
  /** True when this identity was synthesised rather than verified. */
  synthetic: boolean;
}

const PRIVY_ACCESS_TOKEN_COOKIE = "privy-token";

/**
 * How the caller is identified:
 *
 * - `privy` — real token verification.
 * - `dev`   — everyone is the same synthetic owner. The default for local work
 *             so the studio keeps working with no credentials configured.
 * - `off`   — same as `dev`, but semantically "this host has no notion of
 *             users at all": headless tooling, the example apps, tests.
 *
 * Production refuses to start in anything but `privy` — see {@link assertProductionSafe}.
 */
export function getAuthMode(): AuthMode {
  const configured = process.env.AWE_AUTH_MODE as AuthMode | undefined;

  if (configured === "privy" || configured === "dev" || configured === "off") {
    return configured;
  }

  return isPrivyConfigured() ? "privy" : "dev";
}

export function getDevUserId(): string {
  return process.env.AWE_DEV_USER_ID || "dev-owner";
}

/**
 * Fail closed: a production deployment that silently fell back to `dev` would
 * hand every visitor owner rights. Called at the top of the request paths that
 * matter rather than at module load, so tooling can still import this file.
 */
export function assertProductionSafe(): void {
  if (process.env.NODE_ENV !== "production") return;

  const mode = getAuthMode();
  if (mode !== "privy") {
    throw new Error(
      `Refusing to serve: AWE_AUTH_MODE is "${mode}" in production. ` +
        "Set AWE_AUTH_MODE=privy and provide PRIVY_APP_SECRET.",
    );
  }
}

function syntheticIdentity(): Identity {
  return { userId: getDevUserId(), synthetic: true };
}

function readBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

async function identityFromToken(token: string | null): Promise<Identity | null> {
  if (!token) return null;

  const verified = await verifyToken(token);
  if (!verified) return null;

  return { userId: verified.userId, synthetic: false };
}

/**
 * Identity for a route handler, which has the request in hand.
 * Prefers the Authorization header, falling back to Privy's cookie.
 */
export async function getIdentityFromRequest(
  req: Request,
): Promise<Identity | null> {
  assertProductionSafe();

  const mode = getAuthMode();
  if (mode !== "privy") return syntheticIdentity();

  const bearer = readBearer(req.headers.get("authorization"));
  if (bearer) {
    const identity = await identityFromToken(bearer);
    if (identity) return identity;
  }

  return identityFromToken(readCookie(req.headers.get("cookie")));
}

/**
 * Identity for a server action, which has no request object — the token comes
 * from the request cookies via `next/headers`.
 */
export async function getIdentity(): Promise<Identity | null> {
  assertProductionSafe();

  const mode = getAuthMode();
  if (mode !== "privy") return syntheticIdentity();

  // Imported lazily: `next/headers` throws outside a request scope, which
  // would otherwise break headless tooling that imports this module.
  const { cookies } = await import("next/headers");
  const store = await cookies();

  return identityFromToken(store.get(PRIVY_ACCESS_TOKEN_COOKIE)?.value ?? null);
}

export async function requireIdentity(): Promise<Identity> {
  const identity = await getIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

function readCookie(header: string | null): string | null {
  if (!header) return null;

  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === PRIVY_ACCESS_TOKEN_COOKIE) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }

  return null;
}
