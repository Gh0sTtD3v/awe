"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@oncyberio/studio";

/** The caller's profile, as `/api/profile` returns it. */
export interface Profile {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  primary: string | null;
  updatedAt: number;
}

export type ProfileUpdate = Partial<Pick<Profile, "username" | "avatarUrl" | "primary">>;

async function request(token: string | null, path: string, init: RequestInit = {}): Promise<Profile> {
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers, cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body as Profile;
}

/**
 * The signed-in player's profile: loaded on sign-in, cleared on sign-out.
 * Saves go to the server, which checks usernames and pictures; the game
 * server picks the change up and shows it to everyone.
 */
export function useProfile() {
  const { ready, isAnonymous, user, getAccessToken } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready || isAnonymous) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getAccessToken()
      .then((token) => request(token, "/api/profile"))
      .then((p) => !cancelled && setProfile(p))
      .catch((err) => console.warn("[Profile]", err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // Reload for a different account, not for every new token getter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isAnonymous, user.uid]);

  const save = useCallback(
    async (update: ProfileUpdate) => {
      const next = await request(await getAccessToken(), "/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(update),
      });
      setProfile(next);
      return next;
    },
    [getAccessToken],
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const next = await request(await getAccessToken(), "/api/profile/avatar", { method: "POST", body: form });
      setProfile(next);
      return next;
    },
    [getAccessToken],
  );

  return { profile, loading, save, uploadAvatar };
}
