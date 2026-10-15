"use client";

import { createContext, useContext, useMemo } from "react";
import { useLinkJwtAccount, usePrivy } from "@privy-io/react-auth";
import { isPrivyEnabled } from "./privy-provider";
import { useKeplrSession } from "./keplr-session";

export interface User {
  uid: string;
  displayName?: string;
}

/** A login method attached to the account, normalised for display. */
export interface LinkedAccount {
  type: "keplr" | "email" | "wallet" | "social" | "other";
  /** Address, email, or username. */
  label: string;
}

export interface AuthContextState {
  user: User;
  isAnonymous?: boolean;
  /** False until the auth provider has finished initialising. */
  ready: boolean;
  /** Privy's login modal (email, wallets, socials). */
  login: () => void;
  /** Sign in with Keplr. Creates the account on first use. */
  loginWithKeplr: () => Promise<void>;
  logout: () => void;
  /** Access token for authenticating to the game server. Null when signed out. */
  getAccessToken: () => Promise<string | null>;
  /** Login methods on the signed-in account. Empty when signed out. */
  linkedAccounts: LinkedAccount[];
  /** The account's Keplr (Cosmos Hub) address, if one is linked. */
  cosmosAddress: string | null;
  /** True while a Keplr signature or handoff is in flight. */
  keplrPending: boolean;
  /** Attach more login methods to the signed-in account. */
  linkKeplr: () => Promise<void>;
  linkEmail: () => void;
  linkWallet: () => void;
}

const ANONYMOUS_USER: User = {
  uid: "anon",
  displayName: "Anonymous",
};

const noop = () => {};
const noopAsync = async () => {};

const anonymousState: AuthContextState = {
  user: ANONYMOUS_USER,
  isAnonymous: true,
  ready: true,
  login: noop,
  loginWithKeplr: noopAsync,
  logout: noop,
  getAccessToken: async () => null,
  linkedAccounts: [],
  cosmosAddress: null,
  keplrPending: false,
  linkKeplr: noopAsync,
  linkEmail: noop,
  linkWallet: noop,
};

export const AuthContext = createContext<AuthContextState>(anonymousState);

/**
 * Exposes the signed-in user.
 *
 * Two implementations, chosen by whether a Privy app id is configured. The
 * choice is fixed at build time (`NEXT_PUBLIC_PRIVY_APP_ID` is inlined), so
 * hook order is stable across renders.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return isPrivyEnabled() ? (
    <PrivyBackedProvider>{children}</PrivyBackedProvider>
  ) : (
    <AuthContext.Provider value={anonymousState}>
      {children}
    </AuthContext.Provider>
  );
}

function PrivyBackedProvider({ children }: { children: React.ReactNode }) {
  const {
    ready,
    authenticated,
    user,
    login,
    logout,
    getAccessToken,
    linkEmail,
    linkWallet,
  } = usePrivy();
  const keplr = useKeplrSession();
  const { linkWithCustomJwt } = useLinkJwtAccount();

  const value = useMemo<AuthContextState>(() => {
    const accounts: any[] = (authenticated && user?.linkedAccounts) || [];

    return {
      user: authenticated && user
        ? { uid: user.id, displayName: displayNameOf(user) }
        : ANONYMOUS_USER,
      isAnonymous: !authenticated,
      ready,
      login,
      loginWithKeplr: keplr.signIn,
      logout,
      getAccessToken: async () => {
        if (!authenticated) return null;
        return (await getAccessToken()) ?? null;
      },
      linkedAccounts: accounts.map(toLinkedAccount),
      cosmosAddress: cosmosAddressOf(user),
      keplrPending: keplr.pending,
      linkKeplr: async () => {
        const { jwt } = await keplr.prove();
        await linkWithCustomJwt(jwt);
      },
      linkEmail,
      linkWallet: () => linkWallet(),
    };
  }, [
    ready,
    authenticated,
    user,
    login,
    logout,
    getAccessToken,
    linkEmail,
    linkWallet,
    keplr,
    linkWithCustomJwt,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Our Keplr JWTs use the Cosmos address as `sub`, so Privy's `custom_auth` id is the address. */
function cosmosAddressOf(user: any): string | null {
  const account = user?.linkedAccounts?.find((a: any) => a.type === "custom_auth");
  return account?.customUserId ?? null;
}

function toLinkedAccount(account: any): LinkedAccount {
  switch (account.type) {
    case "custom_auth":
      return { type: "keplr", label: account.customUserId };
    case "email":
      return { type: "email", label: account.address };
    case "wallet":
    case "smart_wallet":
      return { type: "wallet", label: account.address };
    default:
      if (String(account.type).endsWith("_oauth")) {
        return {
          type: "social",
          label: account.username ?? account.name ?? account.email ?? account.type,
        };
      }
      return { type: "other", label: account.type };
  }
}

/**
 * A human-readable label for the account, preferring whatever the user
 * actually logged in with. Falls back to a shortened DID.
 */
function displayNameOf(user: any): string {
  return (
    user.discord?.username ??
    user.twitter?.username ??
    user.github?.username ??
    user.google?.name ??
    user.email?.address ??
    shorten(cosmosAddressOf(user) ?? undefined) ??
    shorten(user.wallet?.address) ??
    shorten(user.id) ??
    "Anonymous"
  );
}

function shorten(value?: string): string | undefined {
  if (!value) return undefined;
  return value.length <= 12 ? value : `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function useAuth() {
  return useContext(AuthContext);
}
