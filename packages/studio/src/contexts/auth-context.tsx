"use client";

import { createContext, useContext, useMemo } from "react";
import { useLinkJwtAccount, usePrivy } from "@privy-io/react-auth";
import { isPrivyEnabled } from "./privy-provider";
import { useKeplrSession } from "./keplr-session";

export interface User {
  uid: string;
  displayName?: string;
}

/** Socials that can be linked to an account (each must be enabled in Privy's dashboard). */
export type SocialProvider = "twitter" | "discord" | "github" | "telegram";

/** A login method attached to the account, normalised for display. */
export interface LinkedAccount {
  /** Stable key, e.g. `wallet:0xabc…` or `twitter:12345`. */
  id: string;
  type: "keplr" | "email" | "wallet" | "social" | "other";
  /** Address, email, or username. */
  label: string;
  /** Which social, for `type: "social"`. */
  provider?: SocialProvider | string;
  /** The social's profile picture, when it has one. */
  avatarUrl?: string;
  /** Privy's embedded wallet, created for the account: can't be unlinked. */
  embedded?: boolean;
  /** When it was first linked (ms), for picking the original login method. */
  linkedAt?: number;
  /** Whether {@link AuthContextState.unlink} can remove it. */
  canUnlink: boolean;
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
  /** Link a social account through its OAuth flow. */
  linkSocial: (provider: SocialProvider) => void;
  /** Remove a login method. The account must keep at least one. */
  unlink: (account: LinkedAccount) => Promise<void>;
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
  linkSocial: noop,
  unlink: noopAsync,
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
    linkTwitter,
    linkDiscord,
    linkGithub,
    linkTelegram,
    unlinkEmail,
    unlinkWallet,
    unlinkTwitter,
    unlinkDiscord,
    unlinkGithub,
    unlinkTelegram,
  } = usePrivy();
  const keplr = useKeplrSession();
  const { linkWithCustomJwt } = useLinkJwtAccount();

  const value = useMemo<AuthContextState>(() => {
    const accounts: any[] = (authenticated && user?.linkedAccounts) || [];
    const linked = accounts.map(toLinkedAccount);

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
      // The last way in can't be removed.
      linkedAccounts: linked.map((a) => ({ ...a, canUnlink: a.canUnlink && linked.length > 1 })),
      cosmosAddress: cosmosAddressOf(user),
      keplrPending: keplr.pending,
      linkKeplr: async () => {
        const { jwt } = await keplr.prove();
        await linkWithCustomJwt(jwt);
      },
      linkEmail,
      linkWallet: () => linkWallet(),
      linkSocial: (provider) => {
        if (provider === "twitter") linkTwitter();
        else if (provider === "discord") linkDiscord();
        else if (provider === "github") linkGithub();
        else if (provider === "telegram") linkTelegram();
      },
      unlink: async (account) => {
        const raw = accounts.find((a) => toLinkedAccount(a).id === account.id);
        if (!raw) return;
        if (linked.length <= 1) throw new Error("You need at least one way to sign in.");
        switch (raw.type) {
          case "email":
            await unlinkEmail(raw.address);
            break;
          case "wallet":
            if (raw.walletClientType === "privy") throw new Error("Your built-in wallet can't be removed.");
            await unlinkWallet(raw.address);
            break;
          case "twitter_oauth":
            await unlinkTwitter(raw.subject);
            break;
          case "discord_oauth":
            await unlinkDiscord(raw.subject);
            break;
          case "github_oauth":
            await unlinkGithub(raw.subject);
            break;
          case "telegram":
            await unlinkTelegram(raw.telegramUserId);
            break;
          default:
            throw new Error("This sign-in method can't be removed here.");
        }
      },
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
    linkTwitter,
    linkDiscord,
    linkGithub,
    linkTelegram,
    unlinkEmail,
    unlinkWallet,
    unlinkTwitter,
    unlinkDiscord,
    unlinkGithub,
    unlinkTelegram,
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
  const linkedAt = account.firstVerifiedAt ? new Date(account.firstVerifiedAt).getTime() : undefined;
  const base = { linkedAt };

  switch (account.type) {
    case "custom_auth":
      // Privy has no client call to unlink a custom JWT account.
      return { ...base, id: `keplr:${account.customUserId}`, type: "keplr", label: account.customUserId, canUnlink: false };
    case "email":
      return { ...base, id: `email:${account.address}`, type: "email", label: account.address, canUnlink: true };
    case "wallet":
    case "smart_wallet": {
      const embedded = account.walletClientType === "privy" || account.type === "smart_wallet";
      return {
        ...base,
        id: `wallet:${account.address}`,
        type: "wallet",
        label: account.address,
        embedded,
        canUnlink: !embedded,
      };
    }
    case "telegram":
      return {
        ...base,
        id: `telegram:${account.telegramUserId}`,
        type: "social",
        provider: "telegram",
        label: account.username ?? account.firstName ?? "Telegram",
        avatarUrl: account.photoUrl ?? undefined,
        canUnlink: true,
      };
    default:
      if (String(account.type).endsWith("_oauth")) {
        const provider = String(account.type).replace(/_oauth$/, "");
        return {
          ...base,
          id: `${provider}:${account.subject}`,
          type: "social",
          provider,
          label: account.username ?? account.name ?? account.email ?? provider,
          // X sends a 48px picture; the original size has no `_normal` suffix.
          avatarUrl: account.profilePictureUrl?.replace(/_normal(\.\w+)$/, "$1") ?? undefined,
          canUnlink: ["twitter", "discord", "github"].includes(provider),
        };
      }
      return { ...base, id: `other:${account.type}`, type: "other", label: account.type, canUnlink: false };
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
