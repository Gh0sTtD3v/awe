import { getAuthMode, getDevUserId } from "./auth-service";
import { getLinkedAddresses, verifyToken, type LinkedAddresses } from "./privy-adapter";

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
const addressCache = new Map<string, { addresses: LinkedAddresses; at: number }>();

/**
 * The Cosmos address and Ethereum wallets linked to this identity. The
 * synthetic dev user has no Privy account, so it uses `AWE_DEV_COSMOS_ADDRESS`
 * and `AWE_DEV_EVM_ADDRESS`.
 *
 * Privy lookups are cached per user for a minute; pass `fresh` right after a
 * sign-in or wallet link.
 */
export async function linkedAddressesOf(
  identity: GateIdentity | null,
  opts: { fresh?: boolean } = {},
): Promise<LinkedAddresses> {
  if (!identity) return { cosmos: null, evm: [] };
  if (identity.synthetic) {
    const evm = process.env.AWE_DEV_EVM_ADDRESS?.toLowerCase();
    return { cosmos: process.env.AWE_DEV_COSMOS_ADDRESS || null, evm: evm ? [evm] : [] };
  }

  const cached = addressCache.get(identity.userId);
  if (!opts.fresh && cached && Date.now() - cached.at < ADDRESS_TTL_MS) return cached.addresses;

  const addresses = await getLinkedAddresses(identity.userId);
  addressCache.set(identity.userId, { addresses, at: Date.now() });
  return addresses;
}

/** The Cosmos address linked to this identity. See {@link linkedAddressesOf}. */
export async function cosmosAddressOf(
  identity: GateIdentity | null,
  opts: { fresh?: boolean } = {},
): Promise<string | null> {
  return (await linkedAddressesOf(identity, opts)).cosmos;
}
