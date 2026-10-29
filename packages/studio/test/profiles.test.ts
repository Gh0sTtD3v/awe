import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyProfileUpdate,
  getProfile,
  isAllowedAvatarUrl,
  JsonProfileStore,
  ProfileError,
  readAvatar,
  saveAvatar,
  setProfileStore,
  updateProfile,
  type ProfileData,
} from "../src/server/profiles";
import { avatarGet, avatarUpload, profileGet, profilePut } from "../src/profile-routes";

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
const empty = (): ProfileData => ({ version: 1, profiles: {} });

describe("applyProfileUpdate", () => {
  it("sets and trims a username", () => {
    const data = applyProfileUpdate(empty(), "a", { username: "  Ghost_1 " });
    expect(data.profiles.a.username).toBe("Ghost_1");
  });

  it("refuses bad usernames", () => {
    for (const username of ["ab", "x".repeat(21), "has space", "<script>", "Admin"]) {
      expect(() => applyProfileUpdate(empty(), "a", { username })).toThrow(ProfileError);
    }
  });

  it("keeps usernames unique, ignoring case", () => {
    const data = applyProfileUpdate(empty(), "a", { username: "Ghost" });
    expect(() => applyProfileUpdate(data, "b", { username: "ghost" })).toThrow(/taken/);
    // Re-saving your own name is fine.
    expect(applyProfileUpdate(data, "a", { username: "GHOST" }).profiles.a.username).toBe("GHOST");
  });

  it("clears a username with null or empty", () => {
    const data = applyProfileUpdate(empty(), "a", { username: "Ghost" });
    expect(applyProfileUpdate(data, "a", { username: "" }).profiles.a.username).toBeNull();
  });

  it("only accepts uploaded pictures and social picture hosts", () => {
    expect(isAllowedAvatarUrl("/api/profile/avatar/0123456789abcdef0123456789abcdef.png")).toBe(true);
    expect(isAllowedAvatarUrl("https://pbs.twimg.com/profile_images/1/x.jpg")).toBe(true);
    expect(isAllowedAvatarUrl("/api/profile/avatar/../../etc/passwd")).toBe(false);
    expect(isAllowedAvatarUrl("http://pbs.twimg.com/x.jpg")).toBe(false);
    expect(isAllowedAvatarUrl("https://evil.example/x.png")).toBe(false);
    expect(isAllowedAvatarUrl("javascript:alert(1)")).toBe(false);
    expect(() => applyProfileUpdate(empty(), "a", { avatarUrl: "https://evil.example/x.png" })).toThrow(ProfileError);
  });

  it("leaves fields that aren't in the update alone", () => {
    let data = applyProfileUpdate(empty(), "a", { username: "Ghost", primary: "wallet:0x1" });
    data = applyProfileUpdate(data, "a", { avatarUrl: null });
    expect(data.profiles.a).toMatchObject({ username: "Ghost", primary: "wallet:0x1", avatarUrl: null });
  });
});

describe("profile store, pictures and routes", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "profiles-"));
    process.env.AWE_AVATAR_DIR = path.join(dir, "avatars");
    process.env.AWE_AUTH_MODE = "dev";
    setProfileStore(new JsonProfileStore(path.join(dir, "profiles.json")));
  });

  afterEach(() => {
    setProfileStore(null);
    delete process.env.AWE_AVATAR_DIR;
    delete process.env.AWE_AUTH_MODE;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("saves to disk and reads back", async () => {
    await updateProfile("a", { username: "Ghost" });
    const fresh = new JsonProfileStore(path.join(dir, "profiles.json"));
    expect((await fresh.read()).profiles.a.username).toBe("Ghost");
    expect((await getProfile("nobody")).username).toBeNull();
  });

  it("serializes concurrent updates", async () => {
    await Promise.all([updateProfile("a", { username: "Alpha" }), updateProfile("b", { username: "Bravo" })]);
    const data = JSON.parse(fs.readFileSync(path.join(dir, "profiles.json"), "utf8"));
    expect(Object.keys(data.profiles).sort()).toEqual(["a", "b"]);
  });

  it("names pictures by content and checks their bytes", async () => {
    const url = await saveAvatar(PNG);
    expect(url).toMatch(/^\/api\/profile\/avatar\/[a-f0-9]{32}\.png$/);
    const stored = await readAvatar(path.basename(url));
    expect(stored?.mime).toBe("image/png");

    await expect(saveAvatar(Buffer.from("<svg onload=alert(1)>"))).rejects.toThrow(/PNG, JPEG/);
    await expect(saveAvatar(Buffer.alloc(0))).rejects.toThrow(/empty/);
    expect(await readAvatar("../profiles.json")).toBeNull();
  });

  it("deletes a replaced upload nobody uses", async () => {
    const first = await saveAvatar(PNG);
    await updateProfile("a", { avatarUrl: first });
    await updateProfile("a", { avatarUrl: null });
    expect(await readAvatar(path.basename(first))).toBeNull();
  });

  it("serves the caller's own profile through the routes", async () => {
    const put = await profilePut(
      new Request("http://x/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "DevGhost", userId: "someone-else" }),
      }),
    );
    expect(put.status).toBe(200);
    const saved = await put.json();
    // The id comes from the caller's identity, never from the body.
    expect(saved).toMatchObject({ userId: "dev-owner", username: "DevGhost" });

    const get = await profileGet(new Request("http://x/api/profile"));
    expect((await get.json()).username).toBe("DevGhost");

    const bad = await profilePut(
      new Request("http://x/api/profile", { method: "PUT", body: JSON.stringify({ username: 42 }) }),
    );
    expect(bad.status).toBe(400);
  });

  it("uploads and serves a picture", async () => {
    const form = new FormData();
    form.append("file", new Blob([PNG], { type: "image/png" }), "me.png");
    const res = await avatarUpload(new Request("http://x/api/profile/avatar", { method: "POST", body: form }));
    expect(res.status).toBe(200);
    const { avatarUrl } = await res.json();

    const served = await avatarGet(new Request(`http://x${avatarUrl}`), { params: { name: path.basename(avatarUrl) } });
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
    expect(served.headers.get("x-content-type-options")).toBe("nosniff");

    const missing = await avatarGet(new Request("http://x/"), { params: { name: "..%2Fprofiles.json" } });
    expect(missing.status).toBe(404);
  });
});
