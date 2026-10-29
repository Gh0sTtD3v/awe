/**
 * A player's public profile in this world. Socials, wallets and emails are
 * not stored here: they're login methods linked (and verified) through Privy.
 */
export interface Profile {
  /** Privy DID, or the dev user id outside `privy` mode. */
  userId: string;
  /** Unique in this world, case-insensitively. Null until the player picks one. */
  username: string | null;
  /** An uploaded picture (`/api/profile/avatar/…`) or a linked social's picture. */
  avatarUrl: string | null;
  /** The linked account shown as the player's address, e.g. `wallet:0xabc…`. */
  primary: string | null;
  updatedAt: number;
}

export interface ProfileData {
  version: 1;
  profiles: Record<string, Profile>;
}

export type ProfileUpdate = Partial<Pick<Profile, "username" | "avatarUrl" | "primary">>;

export class ProfileError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "ProfileError";
  }
}

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
const USERNAME_PATTERN = /^[A-Za-z0-9_.-]+$/;
const RESERVED = new Set(["owner", "admin", "administrator", "moderator", "mod", "guest", "anonymous", "system"]);

/** Where uploaded pictures are served. */
export const AVATAR_PATH = "/api/profile/avatar/";
export const AVATAR_FILE_PATTERN = /^[a-f0-9]{16,64}\.(png|jpg|webp|gif)$/;

/** Picture hosts of the socials Privy links, so a player can use their X or Discord picture. */
const AVATAR_HOSTS = [
  "pbs.twimg.com",
  "abs.twimg.com",
  "cdn.discordapp.com",
  "avatars.githubusercontent.com",
  "lh3.googleusercontent.com",
  "t.me",
];

/** Null if fine, else why not. */
export function usernameProblem(username: string): string | null {
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `Usernames are ${USERNAME_MIN} to ${USERNAME_MAX} characters.`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "Use letters, numbers, dots, dashes and underscores only.";
  }
  if (RESERVED.has(username.toLowerCase())) return "That username is reserved.";
  return null;
}

export function isAllowedAvatarUrl(url: string): boolean {
  if (url.startsWith(AVATAR_PATH)) return AVATAR_FILE_PATTERN.test(url.slice(AVATAR_PATH.length));
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && AVATAR_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function emptyProfile(userId: string): Profile {
  return { userId, username: null, avatarUrl: null, primary: null, updatedAt: 0 };
}

export function normalizeProfileData(raw: any): ProfileData {
  const profiles: Record<string, Profile> = {};
  for (const [id, p] of Object.entries<any>(raw?.profiles ?? {})) {
    if (!p || typeof p !== "object") continue;
    profiles[id] = {
      userId: id,
      username: typeof p.username === "string" ? p.username : null,
      avatarUrl: typeof p.avatarUrl === "string" ? p.avatarUrl : null,
      primary: typeof p.primary === "string" ? p.primary : null,
      updatedAt: Number.isFinite(p.updatedAt) ? p.updatedAt : 0,
    };
  }
  return { version: 1, profiles };
}

/**
 * Apply an update for `userId`, validating every field. Throws ProfileError.
 * Pure: the caller saves the result.
 */
export function applyProfileUpdate(
  data: ProfileData,
  userId: string,
  update: ProfileUpdate,
  now = Date.now(),
): ProfileData {
  const current = data.profiles[userId] ?? emptyProfile(userId);
  const next: Profile = { ...current, updatedAt: now };

  if (update.username !== undefined) {
    if (update.username === null || String(update.username).trim() === "") {
      next.username = null;
    } else {
      const username = String(update.username).trim();
      const problem = usernameProblem(username);
      if (problem) throw new ProfileError(problem);
      const lower = username.toLowerCase();
      const taken = Object.values(data.profiles).some(
        (p) => p.userId !== userId && p.username?.toLowerCase() === lower,
      );
      if (taken) throw new ProfileError("That username is taken.", 409);
      next.username = username;
    }
  }

  if (update.avatarUrl !== undefined) {
    if (update.avatarUrl === null || update.avatarUrl === "") next.avatarUrl = null;
    else if (typeof update.avatarUrl === "string" && isAllowedAvatarUrl(update.avatarUrl)) next.avatarUrl = update.avatarUrl;
    else throw new ProfileError("That picture can't be used.");
  }

  if (update.primary !== undefined) {
    if (update.primary === null || update.primary === "") next.primary = null;
    else if (typeof update.primary === "string" && update.primary.length <= 200) next.primary = update.primary;
    else throw new ProfileError("Invalid primary account.");
  }

  return { ...data, profiles: { ...data.profiles, [userId]: next } };
}
