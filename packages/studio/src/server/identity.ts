import { getAuthMode, getDevUserId } from "./auth-service";
import { getCosmosAddress, verifyToken } from "./privy-adapter";

/**
 * Server-side only. Who a caller is, and which Cosmos address they've linked —
 * shared by token gates and roles. The client never gets to name an address.
 */

export interface GateIdentity {
  userId: string;
  /** True for the shared dev identity when auth isn't configured. */
  synthetic: boolean;
}

/**
 * Who is this token? Null for a missing or invalid token in `privy` mode.
 * In `dev` / `off` mode everyone is the synthetic dev user, matching
 * `auth-service`.
 */
export async function identifyAccessToken(
  accessToken: string | null | undefined,
): Promise<GateIdentity | null> {
  if (getAuthMode() !== "privy") {
    return { userId: getDevUserId(), synthetic: true };
  }
  if (!accessToken) return null;

  const verified = await verifyToken(accessToken);
  return verified ? { userId: verified.userId, synthetic: false } : null;
}

const ADDRESS_TTL_MS = 60_000;
const addressCache = new Map<string, { address: string | null; at: number }>();

/**
 * The Cosmos address linked to this identity. The synthetic dev user has no
 * Privy account, so it uses `AWE_DEV_COSMOS_ADDRESS`.
 *
 * Privy lookups are cached per user for a minute; pass `fresh` right after a
 * sign-in or wallet link.
 */
export async function cosmosAddressOf(
  identity: GateIdentity | null,
  opts: { fresh?: boolean } = {},
): Promise<string | null> {
  if (!identity) return null;
  if (identity.synthetic) return process.env.AWE_DEV_COSMOS_ADDRESS || null;

  const cached = addressCache.get(identity.userId);
  if (!opts.fresh && cached && Date.now() - cached.at < ADDRESS_TTL_MS) return cached.address;

  const address = await getCosmosAddress(identity.userId);
  addressCache.set(identity.userId, { address, at: Date.now() });
  return address;
}
