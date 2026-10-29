/**
 * Server-side only — reads `PRIVY_APP_SECRET`. Reachable from client code only
 * through the `"use server"` actions in `src/actions/`.
 *
 * The only module in the repo that talks to a Privy server SDK.
 *
 * Privy currently ships two server packages with incompatible shapes:
 *
 *   - `@privy-io/node` (used here) — `new PrivyClient({appID, appSecret})`,
 *     `client.utils().auth().verifyAccessToken(token)`.
 *   - `@privy-io/server-auth` (older, in maintenance) —
 *     `new PrivyClient(appId, appSecret)`, `client.verifyAuthToken(token)`.
 *
 * Everything else in the codebase goes through {@link verifyToken} and
 * {@link getUserProfile}, so swapping SDKs is a change to this file alone.
 */

export interface VerifiedToken {
  /** The Privy DID, e.g. `did:privy:abc123`. This is the user id everywhere. */
  userId: string;
  appId: string;
  /** Unix seconds. */
  expiresAt: number;
  sessionId: string;
}

export interface UserProfile {
  displayName?: string;
  avatarUrl?: string;
}

export function getPrivyAppId(): string | null {
  return process.env.NEXT_PUBLIC_PRIVY_APP_ID || null;
}

export function isPrivyConfigured(): boolean {
  return !!(getPrivyAppId() && process.env.PRIVY_APP_SECRET);
}

let clientPromise: Promise<any> | null = null;

/**
 * Loaded lazily so that apps which never configure Privy — the examples, and
 * any local dev run — don't pay for the import or crash without credentials.
 */
function getClient(): Promise<any> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const appId = getPrivyAppId();
      const appSecret = process.env.PRIVY_APP_SECRET;

      if (!appId || !appSecret) {
        throw new Error(
          "Privy is not configured: set NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET.",
        );
      }

      const { PrivyClient } = await import("@privy-io/node");
      return new PrivyClient({ appId, appSecret });
    })().catch((err) => {
      // Don't cache the failure — the next call should retry rather than
      // inherit a rejected promise forever.
      clientPromise = null;
      throw err;
    });
  }

  return clientPromise;
}

/**
 * Replace the Privy client — for tests that need several distinct verified
 * users without real credentials. `null` restores the real SDK.
 */
export function setPrivyClient(client: unknown | null): void {
  clientPromise = client ? Promise.resolve(client) : null;
}

/**
 * Verify a Privy access token. Returns null for any invalid or expired token —
 * callers treat null as "not authenticated", never as an error to surface.
 *
 * Verification is a local JWT check against Privy's published keys, so this is
 * cheap enough to call on every request without caching.
 */
export async function verifyToken(
  accessToken: string,
): Promise<VerifiedToken | null> {
  if (!accessToken) return null;

  try {
    const client = await getClient();
    const claims = await client.utils().auth().verifyAccessToken(accessToken);

    if (!claims?.user_id) return null;

    return {
      userId: claims.user_id,
      appId: claims.app_id,
      expiresAt: claims.expiration,
      sessionId: claims.session_id,
    };
  } catch {
    return null;
  }
}

/**
 * Look up a user's profile from their *identity* token (the `privy-id-token`
 * cookie), which is separate from the access token used for verification.
 * Purely cosmetic — a null result just means we show a shortened DID.
 */
export async function getUserProfile(
  identityToken: string,
): Promise<UserProfile | null> {
  if (!identityToken) return null;

  try {
    const client = await getClient();
    const user = await client.users().get({ id_token: identityToken });
    return toProfile(user);
  } catch {
    return null;
  }
}

function toProfile(user: any): UserProfile {
  const accounts: any[] = user?.linked_accounts ?? [];
  const find = (type: string) => accounts.find((a) => a.type === type);

  const displayName =
    find("discord_oauth")?.username ??
    find("twitter_oauth")?.username ??
    find("github_oauth")?.username ??
    find("google_oauth")?.name ??
    find("email")?.address ??
    shortenAddress(find("custom_auth")?.custom_user_id) ??
    shortenAddress(find("wallet")?.address);

  const avatarUrl =
    find("discord_oauth")?.profile_picture_url ??
    find("twitter_oauth")?.profile_picture_url ??
    undefined;

  return { displayName, avatarUrl };
}

function shortenAddress(address?: string): string | undefined {
  if (!address) return undefined;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * The Cosmos address linked to a user through sign-in with Keplr, or null.
 * Keplr JWTs use the address as `sub`, so it is the `custom_auth` user id.
 * Server-side source of truth for gating — never trust an address the client sends.
 */
export async function getCosmosAddress(userId: string): Promise<string | null> {
  return (await getLinkedAddresses(userId)).cosmos;
}

export interface LinkedAddresses {
  /** The Keplr (Cosmos Hub) address, from sign-in with Keplr. */
  cosmos: string | null;
  /** Ethereum wallets on the account, lowercase: Privy's built-in one and any linked (signed for) ones. */
  evm: string[];
}

/** Addresses linked to a user, from Privy. Empty on any failure. */
export async function getLinkedAddresses(userId: string): Promise<LinkedAddresses> {
  if (!userId) return { cosmos: null, evm: [] };

  try {
    const client = await getClient();
    const user = await client.users()._get(userId);
    const accounts: any[] = user?.linked_accounts ?? [];
    return {
      cosmos: accounts.find((a) => a.type === "custom_auth")?.custom_user_id ?? null,
      evm: accounts
        .filter((a) => a.type === "wallet" && (a.chain_type ?? "ethereum") === "ethereum" && typeof a.address === "string")
        .map((a) => a.address.toLowerCase()),
    };
  } catch {
    return { cosmos: null, evm: [] };
  }
}
