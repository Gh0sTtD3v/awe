"use client";

import { AuthProvider, PrivyAuthProvider } from "@oncyberio/studio";

/**
 * App-wide providers. Privy wraps the game route as well as the studio: the
 * game needs an access token to authenticate to the Colyseus server and to
 * fetch chunks the player is allowed to see.
 *
 * `AuthProvider` adds sign-in with Keplr and account linking on top of Privy.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyAuthProvider>
      <AuthProvider>{children}</AuthProvider>
    </PrivyAuthProvider>
  );
}
