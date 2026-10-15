"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { ClientGameService } from "../services/client-game-service";
import type { MyAccess } from "../actions/access";
import type { Permission } from "../server/access/permissions";

/**
 * What the signed-in user may do in this world, as the server sees it.
 * Re-fetched whenever the account changes. The UI uses it to hide or disable
 * controls; the server re-checks every action regardless.
 */

interface AccessContextState {
  /** Null until the first answer arrives. */
  me: MyAccess | null;
  can: (permission: Permission) => boolean;
  refresh: () => Promise<void>;
}

const AccessContext = createContext<AccessContextState>({
  me: null,
  can: () => false,
  refresh: async () => {},
});

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const { user, cosmosAddress, ready } = useAuth();
  const [me, setMe] = useState<MyAccess | null>(null);

  const refresh = useCallback(async () => {
    try {
      setMe(await ClientGameService.getMyAccess());
    } catch (err) {
      console.error("[Access] Couldn't load permissions", err);
      setMe(null);
    }
  }, []);

  useEffect(() => {
    if (ready) void refresh();
  }, [ready, user.uid, cosmosAddress, refresh]);

  const can = useCallback(
    (permission: Permission) => !!me && !me.banned && me.permissions.includes(permission),
    [me],
  );

  return <AccessContext.Provider value={{ me, can, refresh }}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  return useContext(AccessContext);
}
