"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@oncyberio/studio";
import { setAccessTokenGetter } from "@/lib/auth-bridge";
import { getScript } from "@/lib/game-script";

/**
 * Hands the game script a way to get the player's access token, and tells it
 * when sign-in changes (log in, log out, Keplr linked) so the server can
 * re-check which token gates the player may enter.
 *
 * Renders nothing. Mount it before the game connects: child effects run before
 * the parent's, so inside `GameScene` the getter is set before `init()`.
 */
export function AuthBridge() {
  const { ready, user, cosmosAddress, getAccessToken } = useAuth();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    setAccessTokenGetter(getAccessToken);
    return () => setAccessTokenGetter(null);
  }, [getAccessToken]);

  useEffect(() => {
    if (!ready) return;

    const key = `${user.uid}|${cosmosAddress ?? ""}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    // Including the first time auth becomes ready: the room may have been
    // joined before Privy had a token to give. No-op until the room exists,
    // and the join itself then picks up the token.
    void getScript()?.refreshAuth();
  }, [ready, user.uid, cosmosAddress]);

  return null;
}
