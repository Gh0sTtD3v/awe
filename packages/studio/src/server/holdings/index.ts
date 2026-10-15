import { getCosmosAddress } from "../privy-adapter";
import { AsteroidHoldingsProvider } from "./asteroid-provider";
import { StubHoldingsProvider } from "./stub-provider";
import type { HoldingsProvider, Requirement } from "./types";

export type { HoldingsProvider, Requirement } from "./types";
export { toBaseUnits } from "./types";
export { StubHoldingsProvider, getHoldingsFilePath } from "./stub-provider";
export { AsteroidHoldingsProvider } from "./asteroid-provider";

const CACHE_TTL_MS = 60_000;

let provider: HoldingsProvider | null = null;
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

/** Drop cached answers, for one address or all of them. */
export function invalidateHoldings(address?: string): void {
  if (!address) return cache.clear();
  for (const key of cache.keys()) {
    if (key.startsWith(`${address}|`)) cache.delete(key);
  }
}

function cacheKey(address: string, r: Requirement): string {
  return `${address}|${r.type}|${r.ticker ?? ""}|${r.collection ?? ""}|${r.minAmount}`;
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

  const key = cacheKey(address, requirement);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.value;

  try {
    const value = await getHoldingsProvider().meets(address, requirement);
    cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  } catch (err) {
    console.warn("[holdings] lookup failed, denying:", (err as Error).message);
    return false;
  }
}

/**
 * Does this signed-in user meet the requirement? Uses the Keplr address linked
 * to their Privy account — never an address the client claims.
 */
export async function userMeetsRequirement(
  userId: string | null,
  requirement: Requirement,
): Promise<boolean> {
  if (!userId) return false;
  return addressMeetsRequirement(await getCosmosAddress(userId), requirement);
}
