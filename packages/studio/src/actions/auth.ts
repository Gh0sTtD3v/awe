"use server";

import { getAuthMode, getIdentity, type AuthMode } from "../server/auth-service";

export interface AuthStatus {
  mode: AuthMode;
  userId: string | null;
  /** True when the identity was synthesised rather than verified. */
  synthetic: boolean;
}

/**
 * What the server thinks of the caller. Used by the studio to show who it
 * believes you are, and to confirm an auth setup is actually wired up.
 */
export async function getAuthStatus(): Promise<AuthStatus> {
  const identity = await getIdentity();

  return {
    mode: getAuthMode(),
    userId: identity?.userId ?? null,
    synthetic: identity?.synthetic ?? false,
  };
}
