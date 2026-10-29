import { getIdentityFromRequest } from "./server/auth-service";
import {
  getProfile,
  readAvatar,
  saveAvatar,
  updateProfile,
  AVATAR_MAX_BYTES,
  ProfileError,
  type ProfileUpdate,
} from "./server/profiles";

/**
 * Route handlers for player profiles. Each host app mounts them:
 *
 *   /api/profile                → export { profileGet as GET, profilePut as PUT }
 *   /api/profile/avatar         → export { avatarUpload as POST }
 *   /api/profile/avatar/[name]  → export { avatarGet as GET }
 *
 * The caller is identified by their Privy access token (`Authorization:
 * Bearer …`); a profile can only ever be read or changed by its owner.
 */

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function fail(err: unknown) {
  if (err instanceof ProfileError) return json({ error: err.message }, err.status);
  console.error("[Profiles]", err);
  return json({ error: "Something went wrong saving your profile." }, 500);
}

async function caller(request: Request) {
  return getIdentityFromRequest(request);
}

/** `GET` → the caller's profile. */
export async function profileGet(request: Request) {
  const identity = await caller(request);
  if (!identity) return json({ error: "Sign in first." }, 401);
  try {
    return json(await getProfile(identity.userId));
  } catch (err) {
    return fail(err);
  }
}

/** `PUT {username?, avatarUrl?, primary?}` → the updated profile. */
export async function profilePut(request: Request) {
  const identity = await caller(request);
  if (!identity) return json({ error: "Sign in first." }, 401);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  if (!body || typeof body !== "object") return json({ error: "Invalid request." }, 400);

  const update: ProfileUpdate = {};
  for (const key of ["username", "avatarUrl", "primary"] as const) {
    const value = body[key];
    if (value === undefined) continue;
    if (value !== null && typeof value !== "string") return json({ error: `Invalid ${key}.` }, 400);
    update[key] = value;
  }

  try {
    return json(await updateProfile(identity.userId, update));
  } catch (err) {
    return fail(err);
  }
}

/** `POST` multipart `file` → the profile, with the picture set. */
export async function avatarUpload(request: Request) {
  const identity = await caller(request);
  if (!identity) return json({ error: "Sign in first." }, 401);

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > AVATAR_MAX_BYTES + 64 * 1024) return json({ error: "Pictures can be up to 2 MB." }, 413);

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return json({ error: "No picture uploaded." }, 400);

    const url = await saveAvatar(Buffer.from(await file.arrayBuffer()));
    return json(await updateProfile(identity.userId, { avatarUrl: url }));
  } catch (err) {
    return fail(err);
  }
}

/** `GET` → an uploaded picture. Public: other players see it. */
export async function avatarGet(_request: Request, context: { params: Promise<{ name: string }> | { name: string } }) {
  const { name } = await context.params;
  const avatar = await readAvatar(name);
  if (!avatar) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(avatar.bytes), {
    headers: {
      "content-type": avatar.mime,
      // Names are content hashes: a new picture gets a new name.
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'",
    },
  });
}
