import { getLinkedAddresses, type LinkedAddresses } from "../privy-adapter";
import { AsteroidHoldingsProvider } from "./asteroid-provider";
import { RpcEvmHoldingsProvider, type EvmHoldingsProvider } from "./evm-provider";
import { StubHoldingsProvider } from "./stub-provider";
import { isEvmRequirement, type HoldingsProvider, type Requirement } from "./types";

export type { HoldingsProvider, Requirement } from "./types";
export { toBaseUnits, isEvmRequirement } from "./types";
export { StubHoldingsProvider, getHoldingsFilePath } from "./stub-provider";
export { AsteroidHoldingsProvider } from "./asteroid-provider";
export { RpcEvmHoldingsProvider, EVM_CHAINS, getEvmRpcUrl, type EvmHoldingsProvider } from "./evm-provider";

const CACHE_TTL_MS = 60_000;

let provider: HoldingsProvider | null = null;
let evmProvider: EvmHoldingsProvider | null = null;
const cache = new Map<string, { value: boolean; expiresAt: number }>();

/**
 * The Asteroid indexer when `ASTEROID_GRAPHQL_URL` is set, otherwise the local
 * `holdings.json` stub.
 */
export function getHoldingsProvider(): HoldingsProvider {
  if (!provider) {
    const url = process.env.ASTEROID_GRAPHQL_URL;
    provider = url ? new AsteroidHoldingsProvider(url) : new StubHoldingsProvider();
  }
  return provider;
}

/** For tests, or to swap in another source at startup. */
export function setHoldingsProvider(next: HoldingsProvider | null): void {
  provider = next;
  cache.clear();
}

/** EVM chains are read over public JSON-RPC; see {@link RpcEvmHoldingsProvider}. */
export function getEvmHoldingsProvider(): EvmHoldingsProvider {
  if (!evmProvider) evmProvider = new RpcEvmHoldingsProvider();
  return evmProvider;
}

/** For tests, or to swap in another EVM source at startup. */
export function setEvmHoldingsProvider(next: EvmHoldingsProvider | null): void {
  evmProvider = next;
  cache.clear();
}

/** Drop cached answers, for one address or all of them. */
export function invalidateHoldings(address?: string): void {
  if (!address) return cache.clear();
  for (const key of cache.keys()) {
    if (key.startsWith(`${address}|`)) cache.delete(key);
  }
}

function cacheKey(address: string, r: Requirement): string {
  return [address, r.chain ?? "cosmos", r.type, r.ticker ?? "", r.collection ?? "", r.contract ?? "", r.tokenId ?? "", r.minAmount].join("|");
}

/** Cache, and fail closed: lookup errors answer false and aren't cached. */
async function cached(key: string, now: number, lookup: () => Promise<boolean>): Promise<boolean> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.value;

  try {
    const value = await lookup();
    cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  } catch (err) {
    console.warn("[holdings] lookup failed, denying:", (err as Error).message);
    return false;
  }
}

/**
 * Does this Cosmos address meet the requirement? Fails closed: lookup errors
 * answer false and aren't cached, so the next check retries.
 */
export async function addressMeetsRequirement(
  address: string | null,
  requirement: Requirement,
  now = Date.now(),
): Promise<boolean> {
  if (!address) return false;
  return cached(cacheKey(address, requirement), now, () => getHoldingsProvider().meets(address, requirement));
}

/**
 * Do these EVM wallets, together, meet an EVM requirement? Fails closed, like
 * {@link addressMeetsRequirement}.
 */
export async function evmAddressesMeetRequirement(
  addresses: string[],
  requirement: Requirement,
  now = Date.now(),
): Promise<boolean> {
  if (addresses.length === 0) return false;
  const wallets = [...new Set(addresses.map((a) => a.toLowerCase()))].sort();
  return cached(cacheKey(wallets.join(","), requirement), now, () =>
    getEvmHoldingsProvider().meets(wallets, requirement),
  );
}

/**
 * Do these linked wallets meet the requirement? Cosmos requirements use the
 * Keplr address, EVM ones every Ethereum wallet on the account.
 */
export function walletsMeetRequirement(addresses: LinkedAddresses, requirement: Requirement): Promise<boolean> {
  return isEvmRequirement(requirement)
    ? evmAddressesMeetRequirement(addresses.evm, requirement)
    : addressMeetsRequirement(addresses.cosmos, requirement);
}

/**
 * Does this signed-in user meet the requirement? Uses the wallets linked to
 * their Privy account — never an address the client claims.
 */
export async function userMeetsRequirement(
  userId: string | null,
  requirement: Requirement,
): Promise<boolean> {
  if (!userId) return false;
  return walletsMeetRequirement(await getLinkedAddresses(userId), requirement);
}
