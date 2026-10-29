"use client";

import { createContext, useContext } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { KeplrSessionProvider } from "./keplr-session";

/** True inside a PrivyAuthProvider: Privy allows only one PrivyProvider per page. */
const InsidePrivy = createContext(false);

/**
 * Wraps the app in Privy when an app id is configured.
 *
 * With no `NEXT_PUBLIC_PRIVY_APP_ID` this renders children untouched, so the
 * example apps and local dev runs work with no Privy account. `auth-context`
 * degrades to an anonymous user in that case.
 *
 * Safe to nest: a host app can wrap every route (as ghostt does, for the
 * game) while the studio page wraps itself for hosts that don't. The inner
 * one then just renders its children.
 */
export function PrivyAuthProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const nested = useContext(InsidePrivy);

  if (!appId || nested) return <>{children}</>;

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
      <KeplrSessionProvider>
        <InsidePrivy.Provider value={true}>{children}</InsidePrivy.Provider>
      </KeplrSessionProvider>
    </PrivyProvider>
  );
}

export function isPrivyEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;
}
