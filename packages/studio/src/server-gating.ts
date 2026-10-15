/**
 * Server-side only. Token-gate and role checks for game servers that run
 * outside Next (the ghostt Colyseus server), importable as
 * `@oncyberio/studio/server-gating`.
 *
 * Identity comes from a Privy access token; the Cosmos address from the Keplr
 * account linked to it; holdings from the configured provider; roles from the
 * access store. The client never gets to name an address.
 */

import { cosmosAddressOf, type GateIdentity } from "./server/identity";
import { addressMeetsRequirement, type Requirement } from "./server/holdings";

export type { Requirement, HoldingsProvider } from "./server/holdings";
export {
  setHoldingsProvider,
  invalidateHoldings,
  StubHoldingsProvider,
  AsteroidHoldingsProvider,
} from "./server/holdings";

export { identifyAccessToken, cosmosAddressOf, type GateIdentity } from "./server/identity";
/** Test seam: inject a fake Privy client. */
export { setPrivyClient } from "./server/privy-adapter";

export {
  accessFor,
  getAccessStore,
  setAccessStore,
  getOwnerId,
  hasPermission,
  resolveMember,
  sortRoles,
  setBanned,
  AccessError,
  EVERYONE_ROLE_ID,
  JsonAccessStore,
  type AccessData,
  type AccessStore,
  type Permission,
  type ResolvedAccess,
  type Role,
} from "./server/access";

/** Does this identity meet the requirement? Fails closed. */
export async function identityMeetsRequirement(
  identity: GateIdentity | null,
  requirement: Requirement,
): Promise<boolean> {
  return addressMeetsRequirement(await cosmosAddressOf(identity), requirement);
}
