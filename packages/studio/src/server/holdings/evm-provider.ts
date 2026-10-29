import { toBaseUnits, type Requirement } from "./types";

/**
 * Token-gate holdings on EVM chains, read straight from the chain over
 * JSON-RPC — no indexer:
 *
 * - `erc20`: `balanceOf(owner)`, scaled by the token's `decimals()`.
 * - `nft` without `tokenId`: ERC-721 `balanceOf(owner)`.
 * - `nft` with `tokenId`: ERC-1155 `balanceOf(owner, id)`.
 *
 * Balances are summed over every Ethereum wallet on the player's account.
 * Each chain uses a public RPC unless `EVM_RPC_<CHAIN>` (e.g.
 * `EVM_RPC_ETHEREUM`) names another.
 */

/** EVM chains gates can check, with their public RPC endpoints. */
export const EVM_CHAINS: Record<string, { label: string; rpc: string }> = {
  ethereum: { label: "Ethereum", rpc: "https://ethereum-rpc.publicnode.com" },
  base: { label: "Base", rpc: "https://base-rpc.publicnode.com" },
  polygon: { label: "Polygon", rpc: "https://polygon-bor-rpc.publicnode.com" },
  arbitrum: { label: "Arbitrum", rpc: "https://arbitrum-one-rpc.publicnode.com" },
  optimism: { label: "Optimism", rpc: "https://optimism-rpc.publicnode.com" },
  bsc: { label: "BNB Chain", rpc: "https://bsc-rpc.publicnode.com" },
  avalanche: { label: "Avalanche", rpc: "https://avalanche-c-chain-rpc.publicnode.com" },
};

/** Answers "do these EVM wallets, together, satisfy this requirement?". Throws on lookup failure. */
export interface EvmHoldingsProvider {
  readonly name: string;
  meets(addresses: string[], requirement: Requirement): Promise<boolean>;
}

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

const BALANCE_OF = "0x70a08231"; // balanceOf(address)
const BALANCE_OF_1155 = "0x00fdd58e"; // balanceOf(address,uint256)
const DECIMALS = "0x313ce567"; // decimals()

function word(value: bigint): string {
  return value.toString(16).padStart(64, "0");
}

function addressWord(address: string): string {
  return address.slice(2).toLowerCase().padStart(64, "0");
}

function parseTokenId(id: string): bigint | null {
  try {
    return BigInt(id.trim());
  } catch {
    return null;
  }
}

export function getEvmRpcUrl(chain: string): string | null {
  const known = EVM_CHAINS[chain];
  if (!known) return null;
  return process.env[`EVM_RPC_${chain.toUpperCase()}`] || known.rpc;
}

export class RpcEvmHoldingsProvider implements EvmHoldingsProvider {
  readonly name = "evm-rpc";

  private decimals = new Map<string, number>();

  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly rpcUrl: (chain: string) => string | null = getEvmRpcUrl,
  ) {}

  private async call(chain: string, to: string, data: string): Promise<bigint> {
    const url = this.rpcUrl(chain);
    if (!url) throw new Error(`Unknown EVM chain "${chain}"`);

    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`${chain} RPC returned ${res.status}`);

    const body = await res.json();
    if (body.error) throw new Error(`${chain} RPC: ${body.error.message ?? "call failed"}`);
    // "0x" means there's no contract at `to` (or it doesn't implement the call).
    if (typeof body.result !== "string" || body.result === "0x") {
      throw new Error(`${chain}: no contract response from ${to}`);
    }
    return BigInt(body.result.slice(0, 66));
  }

  private async tokenDecimals(chain: string, contract: string): Promise<number> {
    const key = `${chain}|${contract}`;
    let value = this.decimals.get(key);
    if (value === undefined) {
      value = Number(await this.call(chain, contract, DECIMALS));
      this.decimals.set(key, value);
    }
    return value;
  }

  async meets(addresses: string[], requirement: Requirement): Promise<boolean> {
    const chain = requirement.chain ?? "";
    const contract = requirement.contract?.trim() ?? "";
    const owners = addresses.filter((a) => ADDRESS.test(a));
    if (!ADDRESS.test(contract) || owners.length === 0) return false;

    let data: (owner: string) => string;
    let min: bigint;

    if (requirement.type === "nft") {
      const tokenId = requirement.tokenId?.trim() ? parseTokenId(requirement.tokenId) : undefined;
      if (tokenId === null) return false;
      data = tokenId === undefined
        ? (owner) => BALANCE_OF + addressWord(owner)
        : (owner) => BALANCE_OF_1155 + addressWord(owner) + word(tokenId);
      min = 1n;
    } else {
      data = (owner) => BALANCE_OF + addressWord(owner);
      min = toBaseUnits(requirement.minAmount, await this.tokenDecimals(chain, contract));
    }

    const balances = await Promise.all(owners.map((owner) => this.call(chain, contract, data(owner))));
    return balances.reduce((sum, b) => sum + b, 0n) >= min;
  }
}
