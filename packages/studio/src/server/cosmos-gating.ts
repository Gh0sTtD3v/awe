import { getCosmosAddress } from "./privy-adapter";

/**
 * Server-side token gating on Cosmos Hub balances.
 *
 * The address always comes from the user's Privy account (see
 * {@link getCosmosAddress}), never from the client.
 */

function lcdUrl(): string {
  return (process.env.COSMOS_LCD || "https://cosmos-rest.publicnode.com").replace(/\/$/, "");
}

export interface CosmosCoin {
  denom: string;
  amount: string;
}

export async function getCosmosBalances(address: string): Promise<CosmosCoin[]> {
  const res = await fetch(
    `${lcdUrl()}/cosmos/bank/v1beta1/balances/${encodeURIComponent(address)}?pagination.limit=1000`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Cosmos LCD returned ${res.status}`);

  const data = await res.json();
  return data.balances ?? [];
}

/**
 * True when the address holds at least `minAmount` (in base units, e.g. uatom)
 * of `denom`. IBC tokens use their `ibc/…` denom.
 */
export async function hasCosmosBalance(
  address: string,
  denom: string,
  minAmount: bigint | number | string = 1,
): Promise<boolean> {
  const balances = await getCosmosBalances(address);
  const coin = balances.find((c) => c.denom === denom);
  return coin ? BigInt(coin.amount) >= BigInt(minAmount) : false;
}

/**
 * Gate for a signed-in user: resolves their linked Keplr address and checks the
 * balance. False when no Keplr wallet is linked or the chain can't be reached.
 */
export async function userHasCosmosBalance(
  userId: string,
  denom: string,
  minAmount: bigint | number | string = 1,
): Promise<boolean> {
  const address = await getCosmosAddress(userId);
  if (!address) return false;

  try {
    return await hasCosmosBalance(address, denom, minAmount);
  } catch {
    return false;
  }
}
