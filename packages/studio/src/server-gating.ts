/**
 * Server-side only. Token-gate and role checks for game servers that run
 * outside Next (the ghostt Colyseus server), importable as
 * `@oncyberio/studio/server-gating`.
 *
 * Identity comes from a Privy access token; wallets from the accounts linked
 * to it (Keplr for Cosmos, Ethereum wallets for EVM chains); holdings from the
 * configured providers; roles from the
 * access store. The client never gets to name an address.
 */

import { linkedAddressesOf, type GateIdentity } from "./server/identity";
import { walletsMeetRequirement, type Requirement } from "./server/holdings";

export type { Requirement, HoldingsProvider } from "./server/holdings";
export {
  setHoldingsProvider,
  invalidateHoldings,
  setEvmHoldingsProvider,
  StubHoldingsProvider,
  AsteroidHoldingsProvider,
  RpcEvmHoldingsProvider,
  EVM_CHAINS,
  type EvmHoldingsProvider,
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
  previewAccess,
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

export {
  getProfile,
  getProfileStore,
  setProfileStore,
  JsonProfileStore,
  type Profile,
  type ProfileStore,
} from "./server/profiles";

/** Does this identity meet the requirement? Fails closed. */
export async function identityMeetsRequirement(
  identity: GateIdentity | null,
  requirement: Requirement,
): Promise<boolean> {
  return walletsMeetRequirement(await linkedAddressesOf(identity), requirement);
}
