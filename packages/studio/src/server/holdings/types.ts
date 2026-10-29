/**
 * What a token gate asks of a player. Mirrors the `token-gate` component's
 * requirement fields.
 */
export interface Requirement {
  type: "cft20" | "inscription" | "erc20" | "nft";
  /** `"cosmos"` (the default) or an EVM chain id from {@link EVM_CHAINS}. */
  chain?: string;
  /** CFT-20 ticker, e.g. `ROIDS`. Compared case-insensitively. For ERC-20, a display symbol. */
  ticker?: string;
  /** Inscription collection id or symbol. */
  collection?: string;
  /** ERC-20 / NFT contract address, `0x…`. */
  contract?: string;
  /** ERC-1155 token id; absent for ERC-721. */
  tokenId?: string;
  /** Minimum CFT-20 / ERC-20 balance in display units, e.g. `"100"` or `"0.5"`. */
  minAmount: string;
}

/** True for requirements checked on an EVM chain rather than Cosmos. */
export function isEvmRequirement(requirement: Requirement): boolean {
  return !!requirement.chain && requirement.chain !== "cosmos";
}

/**
 * Answers "does this Cosmos address satisfy this requirement?".
 *
 * CFT-20 balances and inscription ownership live in an inscriptions indexer,
 * not in Cosmos bank balances, so they need their own source. Implementations
 * should throw on lookup failure; callers fail closed.
 */
export interface HoldingsProvider {
  readonly name: string;
  meets(address: string, requirement: Requirement): Promise<boolean>;
}

/**
 * Parse a decimal string into base units at `decimals` precision, without
 * floating point. `"1.5"` at 6 decimals → `1500000n`. Extra precision is
 * truncated.
 */
export function toBaseUnits(amount: string, decimals: number): bigint {
  const match = /^\s*(\d*)(?:\.(\d*))?\s*$/.exec(amount);
  if (!match || (match[1] === "" && !match[2])) {
    throw new Error(`Invalid amount: "${amount}"`);
  }

  const whole = match[1] || "0";
  const fraction = (match[2] ?? "").slice(0, decimals).padEnd(decimals, "0");
  return BigInt(whole + fraction);
}
