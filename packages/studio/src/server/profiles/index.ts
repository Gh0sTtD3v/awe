import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { JsonProfileStore, type ProfileStore } from "./json-store";
import {
  applyProfileUpdate,
  AVATAR_FILE_PATTERN,
  AVATAR_PATH,
  emptyProfile,
  ProfileError,
  type Profile,
  type ProfileUpdate,
} from "./types";

/**
 * Server-side only. Player profiles (username, picture, primary account) and
 * uploaded profile pictures.
 */

export * from "./types";
export { JsonProfileStore, type ProfileStore } from "./json-store";

let store: ProfileStore | null = null;

function dataRoot(): string {
  return path.join(process.cwd(), ".data");
}

export function getProfileStore(): ProfileStore {
  if (!store) {
    store = new JsonProfileStore(
      path.resolve(process.env.AWE_PROFILES_FILE || path.join(dataRoot(), "profiles.json")),
    );
  }
  return store;
}

/** Swap the backing store (tests, or a database later). `null` restores the default. */
export function setProfileStore(next: ProfileStore | null): void {
  store = next;
}

export function avatarDir(): string {
  return path.resolve(process.env.AWE_AVATAR_DIR || path.join(dataRoot(), "avatars"));
}

export async function getProfile(userId: string): Promise<Profile> {
  const data = await getProfileStore().read();
  return data.profiles[userId] ?? emptyProfile(userId);
}

export async function updateProfile(userId: string, update: ProfileUpdate): Promise<Profile> {
  let previousAvatar: string | null = null;
  const data = await getProfileStore().update((d) => {
    previousAvatar = d.profiles[userId]?.avatarUrl ?? null;
    return applyProfileUpdate(d, userId, update);
  });
  const profile = data.profiles[userId];

  // Drop the old upload once nobody uses it.
  const old = previousAvatar as string | null;
  if (old && old !== profile.avatarUrl && old.startsWith(AVATAR_PATH)) {
    const stillUsed = Object.values(data.profiles).some((p) => p.avatarUrl === old);
    if (!stillUsed) await fs.promises.rm(path.join(avatarDir(), path.basename(old)), { force: true }).catch(() => {});
  }
  return profile;
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const IMAGE_TYPES: { ext: string; mime: string; test: (b: Buffer) => boolean }[] = [
  {
    ext: "png",
    mime: "image/png",
    test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  { ext: "jpg", mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "gif", mime: "image/gif", test: (b) => b.subarray(0, 4).toString("latin1") === "GIF8" },
  {
    ext: "webp",
    mime: "image/webp",
    test: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  },
];

/**
 * Store an uploaded picture and return its URL. The type comes from the
 * file's bytes, never from what the browser claims, and the name from its hash.
 */
export async function saveAvatar(bytes: Buffer): Promise<string> {
  if (bytes.length === 0) throw new ProfileError("That file is empty.");
  if (bytes.length > AVATAR_MAX_BYTES) throw new ProfileError("Pictures can be up to 2 MB.", 413);
  const type = IMAGE_TYPES.find((t) => t.test(bytes));
  if (!type) throw new ProfileError("Use a PNG, JPEG, WebP or GIF picture.", 415);

  const name = `${crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 32)}.${type.ext}`;
  const dir = avatarDir();
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(path.join(dir, name), bytes);
  return `${AVATAR_PATH}${name}`;
}

/** An uploaded picture's bytes, or null. `name` is checked: no path tricks. */
export async function readAvatar(name: string): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!AVATAR_FILE_PATTERN.test(name)) return null;
  const mime = IMAGE_TYPES.find((t) => t.ext === path.extname(name).slice(1))?.mime;
  if (!mime) return null;
  try {
    return { bytes: await fs.promises.readFile(path.join(avatarDir(), name)), mime };
  } catch {
    return null;
  }
}
