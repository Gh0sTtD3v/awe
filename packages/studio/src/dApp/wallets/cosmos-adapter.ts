import type { Keplr, StdSignature } from "@keplr-wallet/types";
import type { WalletAdapter, WalletConnection, WalletType } from "./types";

declare global {
  interface Window {
    keplr?: Keplr;
  }
}

export const COSMOS_CHAIN_ID =
  process.env.NEXT_PUBLIC_COSMOS_CHAIN_ID || "cosmoshub-4";

export const COSMOS_RPC =
  process.env.NEXT_PUBLIC_COSMOS_RPC || "https://cosmos-rpc.publicnode.com:443";

export const KEPLR_INSTALL_URL = "https://www.keplr.app/get";

export function getKeplr(): Keplr | null {
  if (typeof window === "undefined") return null;
  return window.keplr ?? null;
}

export function isKeplrInstalled(): boolean {
  return getKeplr() !== null;
}

function requireKeplr(): Keplr {
  const keplr = getKeplr();
  if (!keplr) throw new Error("Keplr is not installed");
  return keplr;
}

/**
 * Cosmos wallet adapter backed by the Keplr extension.
 * Mirrors {@link EvmWalletAdapter}; the account is a bech32 address.
 */
export class CosmosWalletAdapter implements WalletAdapter {
  readonly walletType: WalletType = "cosmos";

  private address: string | null = null;

  constructor(readonly chainId: string = COSMOS_CHAIN_ID) {}

  /**
   * Ask Keplr for access to the chain and return the active key's address.
   */
  async connect(): Promise<WalletConnection> {
    const keplr = requireKeplr();
    await keplr.enable(this.chainId);

    const key = await keplr.getKey(this.chainId);
    this.address = key.bech32Address;

    return {
      walletId: key.bech32Address,
      walletType: this.walletType,
      chainId: this.chainId,
      provider: keplr,
    };
  }

  /**
   * Keplr has no per-site disconnect in older versions; forget the account
   * locally and revoke permission where supported.
   */
  async disconnect(): Promise<void> {
    this.address = null;
    try {
      await (getKeplr() as any)?.disable?.(this.chainId);
    } catch {}
  }

  async getAccount(): Promise<string | null> {
    return this.address;
  }

  isConnected(): boolean {
    return this.address !== null;
  }

  /**
   * ADR-036 arbitrary-message signature, used for sign-in.
   */
  async signArbitrary(signer: string, message: string): Promise<StdSignature> {
    return requireKeplr().signArbitrary(this.chainId, signer, message);
  }

  /**
   * Signer for `SigningStargateClient.connectWithSigner`.
   */
  getOfflineSigner() {
    return requireKeplr().getOfflineSignerAuto(this.chainId);
  }

  /**
   * A CosmJS signing client bound to Keplr, for `signAndBroadcast` and friends.
   * CosmJS is loaded on demand so sign-in alone doesn't pay for it.
   */
  async getSigningClient() {
    const { SigningStargateClient, GasPrice } = await import("@cosmjs/stargate");
    const signer = await this.getOfflineSigner();
    return SigningStargateClient.connectWithSigner(COSMOS_RPC, signer, {
      gasPrice: GasPrice.fromString("0.025uatom"),
    });
  }

  /**
   * Send tokens from the connected account. `amount` is in base units (uatom).
   * @returns The transaction hash
   */
  async sendTokens(
    recipient: string,
    amount: string,
    denom = "uatom",
    memo = "",
  ): Promise<string> {
    const sender = this.address ?? (await this.connect()).walletId;
    const client = await this.getSigningClient();

    const result = await client.sendTokens(
      sender,
      recipient,
      [{ denom, amount }],
      "auto",
      memo,
    );
    if (result.code !== 0) {
      throw new Error(`Transaction failed (code ${result.code}): ${result.rawLog ?? ""}`);
    }
    return result.transactionHash;
  }

  /**
   * Keplr fires `keplr_keystorechange` when the user switches account.
   * @returns Unsubscribe function
   */
  onAccountChange(callback: (account: string | null) => void): () => void {
    const handler = async () => {
      try {
        const key = await requireKeplr().getKey(this.chainId);
        this.address = key.bech32Address;
      } catch {
        this.address = null;
      }
      callback(this.address);
    };

    window.addEventListener("keplr_keystorechange", handler);
    return () => window.removeEventListener("keplr_keystorechange", handler);
  }
}

let cosmosAdapterInstance: CosmosWalletAdapter | null = null;

/**
 * Get the singleton Cosmos wallet adapter instance
 */
export function getCosmosWalletAdapter(): CosmosWalletAdapter {
  if (!cosmosAdapterInstance) {
    cosmosAdapterInstance = new CosmosWalletAdapter();
  }
  return cosmosAdapterInstance;
}
