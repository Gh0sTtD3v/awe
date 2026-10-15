"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { KeplrSessionProvider } from "./keplr-session";

/**
 * Wraps the app in Privy when an app id is configured.
 *
 * With no `NEXT_PUBLIC_PRIVY_APP_ID` this renders children untouched, so the
 * example apps and local dev runs work with no Privy account. `auth-context`
 * degrades to an anonymous user in that case.
 */
export function PrivyAuthProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) return <>{children}</>;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: { theme: "dark" },
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
        },
      }}
    >
      <KeplrSessionProvider>{children}</KeplrSessionProvider>
    </PrivyProvider>
  );
}

export function isPrivyEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;
}
