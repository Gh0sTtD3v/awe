"use client";

import { useCallback, useEffect, useState } from "react";
import { ClientGameService } from "../../services/client-game-service";
import { useAccess } from "../../contexts/access-context";
import type { AccessOverview, AccessResult } from "../../actions/access";
import type { Role } from "../../server/access/types";

/**
 * Roles + members as the server last returned them. Every change goes through
 * `apply`, which replaces the overview with the server's answer, so the UI
 * never drifts from what was actually saved.
 */
export function useAccessOverview() {
  const { refresh: refreshMe } = useAccess();
  const [overview, setOverview] = useState<AccessOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await ClientGameService.listAccess();
    if (!("error" in result)) {
      setOverview(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = useCallback(
    async (call: () => Promise<AccessResult<AccessOverview>>): Promise<AccessOverview | null> => {
      setBusy(true);
      try {
        const result = await call();
        if ("error" in result) {
          setError(result.error);
          return null;
        }
        setOverview(result.data);
        setError(null);
        // The change may have altered the current user's own permissions.
        void refreshMe();
        return result.data;
      } finally {
        setBusy(false);
      }
    },
    [refreshMe],
  );

  return { overview, error, setError, busy, apply, reload: load };
}

/** Mirrors the server rule: only roles strictly below your highest role. */
export function canManageRole(overview: AccessOverview, role: Role): boolean {
  const top = overview.me.topPosition;
  return top === null || role.position < top;
}

/** A member's rank: their highest role's position (0 = only `everyone`). */
export function memberTopPosition(overview: AccessOverview, roleIds: string[]): number {
  return overview.roles
    .filter((r) => roleIds.includes(r.id))
    .reduce((top, r) => Math.max(top, r.position), 0);
}

export function shortSubject(subject: string): string {
  if (subject.length <= 22) return subject;
  return `${subject.slice(0, 12)}…${subject.slice(-6)}`;
}
