/**
 * What a token gate asks of a player. Mirrors the `token-gate` component's
 * requirement fields.
 */
export interface Requirement {
  type: "cft20" | "inscription";
  /** CFT-20 ticker, e.g. `ROIDS`. Compared case-insensitively. */
  ticker?: string;
  /** Inscription collection id or symbol. */
  collection?: string;
  /** Minimum CFT-20 balance in display units, e.g. `"100"` or `"0.5"`. */
  minAmount: string;
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
