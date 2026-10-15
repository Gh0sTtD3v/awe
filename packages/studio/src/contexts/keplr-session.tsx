"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSubscribeToJwtAuthWithFlag } from "@privy-io/react-auth";
import { getCosmosWalletAdapter } from "../dApp/wallets/cosmos-adapter";

/**
 * Sign-in with Keplr, handed to Privy through its JWT-based auth.
 *
 * The Keplr JWT is only a *handoff*: while one is pending, the bridge below
 * enables Privy's JWT sync so Privy exchanges it for a Privy session. Once that
 * happens the handoff is cleared and sync is disabled again, so the Privy
 * session lives on like any other login and Privy's own login methods (email,
 * wallets) keep working the rest of the time.
 */

const KEPLR_ROUTES = "/api/auth/keplr";
const HANDOFF_TIMEOUT_MS = 30_000;

export interface KeplrProof {
  address: string;
  /** Short-lived JWT, `sub` = address. */
  jwt: string;
}

interface KeplrSessionState {
  /** True while a sign-in is being signed or handed to Privy. */
  pending: boolean;
  /** Sign with Keplr and log in to Privy as that wallet's account. */
  signIn: () => Promise<void>;
  /** Sign with Keplr and return the proof, without logging in. Used to link. */
  prove: () => Promise<KeplrProof>;
}

const KeplrSessionContext = createContext<KeplrSessionState | null>(null);

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${KEPLR_ROUTES}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Keplr ${path} failed (${res.status})`);
  return data as T;
}

/**
 * Connect Keplr, sign our challenge, and trade the signature for a JWT.
 */
export async function proveKeplrOwnership(): Promise<KeplrProof> {
  const adapter = getCosmosWalletAdapter();
  const { walletId: address } = await adapter.connect();

  const { nonce, message } = await post<{ nonce: string; message: string }>("nonce", {
    address,
  });
  const { pub_key, signature } = await adapter.signArbitrary(address, message);

  const { jwt } = await post<{ jwt: string }>("verify", {
    address,
    nonce,
    pubKey: pub_key.value,
    signature,
  });

  return { address, jwt };
}

/**
 * Must sit inside `PrivyProvider` and stay mounted for the app's lifetime.
 */
export function KeplrSessionProvider({ children }: { children: React.ReactNode }) {
  const [handoff, setHandoff] = useState<KeplrProof | null>(null);
  const [signing, setSigning] = useState(false);

  // Resolves the `signIn()` promise once Privy has (or hasn't) taken the handoff.
  const settle = useRef<{ resolve: () => void; reject: (err: Error) => void } | null>(null);

  const finish = useCallback((err?: Error) => {
    setHandoff(null);
    const pending = settle.current;
    settle.current = null;
    if (err) pending?.reject(err);
    else pending?.resolve();
  }, []);

  useSubscribeToJwtAuthWithFlag({
    enabled: handoff !== null,
    isAuthenticated: handoff !== null,
    isLoading: false,
    // Must not throw: Privy logs the user out if it does.
    getExternalJwt: useCallback(async () => handoff?.jwt, [handoff]),
    onAuthenticated: () => finish(),
    onError: (err) => finish(err),
  });

  const signIn = useCallback(async () => {
    setSigning(true);
    try {
      const proof = await proveKeplrOwnership();
      await new Promise<void>((resolve, reject) => {
        settle.current = { resolve, reject };
        setHandoff(proof);
        // Don't hang forever if Privy never reports back (e.g. custom auth
        // not enabled in the dashboard).
        setTimeout(() => {
          if (settle.current?.resolve === resolve) {
            finish(new Error("Privy did not accept the Keplr sign-in in time"));
          }
        }, HANDOFF_TIMEOUT_MS);
      });
    } finally {
      setSigning(false);
    }
  }, [finish]);

  const value = useMemo<KeplrSessionState>(
    () => ({ pending: signing || handoff !== null, signIn, prove: proveKeplrOwnership }),
    [signing, handoff, signIn],
  );

  return (
    <KeplrSessionContext.Provider value={value}>{children}</KeplrSessionContext.Provider>
  );
}

export function useKeplrSession(): KeplrSessionState {
  const ctx = useContext(KeplrSessionContext);
  if (!ctx) throw new Error("useKeplrSession must be used inside KeplrSessionProvider");
  return ctx;
}
