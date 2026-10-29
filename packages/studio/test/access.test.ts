import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AccessError,
  JsonAccessStore,
  PERMISSION_IDS,
  addMember,
  createRole,
  defaultAccessData,
  deleteRole,
  normalizeAccessData,
  removeMember,
  reorderRoles,
  resolveAccess,
  setAccessStore,
  setBanned,
  setMemberRoles,
  updateRole,
  validateSubject,
  type AccessData,
  type ActorContext,
  type Role,
} from "../src/server/access";
import { pubKeyToAddress } from "../src/server/keplr-auth";

// Real bech32 addresses so subject validation passes.
const ADDR_A = pubKeyToAddress(new Uint8Array(33).fill(2));
const ADDR_B = pubKeyToAddress(new Uint8Array(33).fill(3));
const OWNER = "did:privy:owner";
const ALICE = "did:privy:alice";
const BOB = "did:privy:bob";

const role = (id: string, position: number, permissions: Role["permissions"] = {}): Role => ({
  id,
  name: id,
  color: "#ffffff",
  position,
  permissions,
});

/** manager (3) > helper (2) > vip (1) > everyone (0) */
function world(): AccessData {
  return normalizeAccessData({
    version: 3,
    roles: [
      role("manager", 3, { manage_roles: true, manage_members: true, ban_members: true, kick_members: true, speak: true }),
      role("helper", 2, { manage_roles: true, manage_members: true, speak: true }),
      role("vip", 1, { speak: true }),
      role("everyone", 0, { speak: true }),
    ],
    members: [
      { subject: ALICE, roleIds: ["manager"], addedAt: 1 },
      { subject: BOB, roleIds: ["helper"], addedAt: 1 },
      { subject: ADDR_A, roleIds: ["vip"], addedAt: 1 },
    ],
  });
}

function actor(data: AccessData, userId: string | null, cosmosAddress: string | null = null): ActorContext {
  return { access: resolveAccess({ userId, cosmosAddress }, data, OWNER), actorId: userId, ownerId: OWNER };
}

const forbidden = (fn: () => unknown) => {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(AccessError);
    expect((err as AccessError).code).toBe("forbidden");
    return;
  }
  throw new Error("Expected a forbidden AccessError");
};

describe("resolveAccess", () => {
  it("gives the owner everything, above every role", () => {
    const access = resolveAccess({ userId: OWNER, cosmosAddress: null }, world(), OWNER);
    expect(access.isOwner).toBe(true);
    expect(access.permissions.sort()).toEqual([...PERMISSION_IDS].sort());
    expect(access.topPosition).toBe(Infinity);
  });

  it("recognises the owner by linked cosmos address, case-insensitively", () => {
    const access = resolveAccess({ userId: ALICE, cosmosAddress: ADDR_B }, world(), ADDR_B.toUpperCase());
    expect(access.isOwner).toBe(true);
  });

  it("recognises the owner by a linked Ethereum wallet, whatever its checksum casing", () => {
    const wallet = "0x75ED5982B7948E676892d9052DF8e6cceE1A301b";
    const linked = { userId: ALICE, cosmosAddress: null, evmAddresses: [wallet.toLowerCase()] };
    expect(resolveAccess(linked, world(), wallet).isOwner).toBe(true);
    expect(resolveAccess({ userId: ALICE, cosmosAddress: null }, world(), wallet).isOwner).toBe(false);
  });

  it("unions role permissions and ranks by the highest role", () => {
    const access = resolveAccess({ userId: BOB, cosmosAddress: null }, world(), OWNER);
    expect(access.roleIds).toEqual(["helper", "everyone"]);
    expect(access.permissions.sort()).toEqual(["manage_members", "manage_roles", "speak"]);
    expect(access.topPosition).toBe(2);
  });

  it("applies roles given to a linked cosmos address", () => {
    const access = resolveAccess({ userId: "did:privy:carol", cosmosAddress: ADDR_A }, world(), OWNER);
    expect(access.roleIds).toEqual(["vip", "everyone"]);
  });

  it("gives anonymous players only everyone", () => {
    const access = resolveAccess({ userId: null, cosmosAddress: null }, world(), OWNER);
    expect(access.roleIds).toEqual(["everyone"]);
    expect(access.permissions).toEqual(["speak"]);
    expect(access.topPosition).toBe(0);
  });

  it("expands administrator to every permission", () => {
    const data = normalizeAccessData({ ...world(), roles: [...world().roles, role("admin", 9, { administrator: true })] });
    data.members.push({ subject: "did:privy:dan", roleIds: ["admin"], addedAt: 1 });
    const access = resolveAccess({ userId: "did:privy:dan", cosmosAddress: null }, data, OWNER);
    expect(access.permissions.sort()).toEqual([...PERMISSION_IDS].sort());
  });

  it("reports bans from either subject", () => {
    const data = world();
    data.members.find((m) => m.subject === ADDR_A)!.banned = true;
    expect(resolveAccess({ userId: "did:privy:carol", cosmosAddress: ADDR_A }, data, OWNER).banned).toBe(true);
  });
});

describe("normalizeAccessData", () => {
  it("seeds editable defaults with everyone at the bottom", () => {
    const data = defaultAccessData();
    expect(data.roles.map((r) => r.id)).toEqual(["admin", "moderator", "builder", "speaker", "everyone"]);
    expect(data.roles.map((r) => r.position)).toEqual([4, 3, 2, 1, 0]);
  });

  it("migrates legacy roles: list order is rank, moderate splits into kick + ban", () => {
    const data = normalizeAccessData({
      roles: [
        { id: "a", name: "A", color: "#000000", permissions: { moderate: true, bogus: true } },
        { id: "b", name: "B", color: "#000000", permissions: { build: true } },
      ],
    });
    expect(data.roles.map((r) => [r.id, r.position])).toEqual([["a", 2], ["b", 1], ["everyone", 0]]);
    expect(data.roles[0].permissions).toEqual({ kick_members: true, ban_members: true });
  });

  it("drops member references to missing roles and merges duplicate subjects", () => {
    const data = normalizeAccessData({
      ...world(),
      members: [
        { subject: ADDR_A.toUpperCase(), roleIds: ["vip", "ghost"], addedAt: 1 },
        { subject: ADDR_A, roleIds: ["helper"], banned: true, addedAt: 1 },
      ],
    });
    expect(data.members).toHaveLength(1);
    expect(data.members[0]).toMatchObject({ subject: ADDR_A, roleIds: ["vip", "helper"], banned: true });
  });

  it("lets everyone chat in worlds saved before text chat existed", () => {
    const old = normalizeAccessData({ version: 1, roles: [role("everyone", 0, { speak: true })] });
    expect(old.version).toBe(3);
    expect(old.roles.at(-1)?.permissions).toEqual({ speak: true, send_messages: true });

    // Once migrated, taking it away sticks.
    const revoked = normalizeAccessData({ version: 2, roles: [role("everyone", 0, { speak: true })] });
    expect(revoked.roles.at(-1)?.permissions).toEqual({ speak: true });
  });

  it("gives the Speaker role chunk broadcasts in worlds saved before them", () => {
    const speaker = () => role("speaker", 1, { speak: true });
    const old = normalizeAccessData({ version: 2, roles: [speaker(), role("vip", 2), role("everyone", 0)] });
    expect(old.version).toBe(3);
    expect(old.roles.find((r) => r.id === "speaker")?.permissions).toEqual({ speak: true, broadcast_voice: true });
    expect(old.roles.find((r) => r.id === "vip")?.permissions).toEqual({});

    // Once migrated, taking it away sticks.
    const revoked = normalizeAccessData({ version: 3, roles: [speaker(), role("everyone", 0)] });
    expect(revoked.roles.find((r) => r.id === "speaker")?.permissions).toEqual({ speak: true });
  });
});

describe("role rules", () => {
  it("lets the owner do anything", () => {
    const data = world();
    const ctx = actor(data, OWNER);
    const { data: next, role: created } = createRole(data, ctx, { name: "Elite", permissions: { administrator: true } });
    expect(created.position).toBe(1);
    expect(deleteRole(next, actor(next, OWNER), "manager").roles.some((r) => r.id === "manager")).toBe(false);
  });

  it("puts new roles at the bottom, still below their creator", () => {
    const data = world();
    const { data: next, role: created } = createRole(data, actor(data, BOB), { name: "New" });
    expect(created.position).toBe(1);
    expect(next.roles.find((r) => r.id === "helper")!.position).toBe(3);
  });

  it("refuses roles at or above your highest role", () => {
    const data = world();
    const bob = actor(data, BOB);
    forbidden(() => updateRole(data, bob, "helper", { name: "mine" })); // equal
    forbidden(() => updateRole(data, bob, "manager", { name: "x" })); // above
    forbidden(() => deleteRole(data, bob, "manager"));
    expect(updateRole(data, bob, "vip", { name: "VIP+" }).roles.find((r) => r.id === "vip")!.name).toBe("VIP+");
  });

  it("refuses granting or revoking permissions you don't hold", () => {
    const data = world();
    const bob = actor(data, BOB);
    forbidden(() => updateRole(data, bob, "vip", { permissions: { speak: true, build: true } }));
    forbidden(() => createRole(data, bob, { permissions: { administrator: true } }));

    const withBuild = updateRole(data, actor(data, OWNER), "vip", { permissions: { speak: true, build: true } });
    // Bob lacks build, so he can neither remove it nor delete the role carrying it.
    forbidden(() => updateRole(withBuild, actor(withBuild, BOB), "vip", { permissions: { speak: true } }));
    forbidden(() => deleteRole(withBuild, actor(withBuild, BOB), "vip"));
  });

  it("refuses everything without Manage Roles", () => {
    const data = world();
    forbidden(() => createRole(data, actor(data, null, ADDR_A), {}));
  });

  it("never deletes or moves everyone", () => {
    const data = world();
    expect(() => deleteRole(data, actor(data, OWNER), "everyone")).toThrow(AccessError);
    const next = reorderRoles(data, actor(data, OWNER), ["vip", "helper", "manager"]);
    expect(next.roles.map((r) => r.id)).toEqual(["vip", "helper", "manager", "everyone"]);
  });

  it("only lets you reorder below your highest role", () => {
    const data = world();
    const alice = actor(data, ALICE); // manager, top 3
    const next = reorderRoles(data, alice, ["manager", "vip", "helper"]);
    expect(next.roles.map((r) => r.id)).toEqual(["manager", "vip", "helper", "everyone"]);
    forbidden(() => reorderRoles(data, alice, ["vip", "manager", "helper"]));
    expect(() => reorderRoles(data, alice, ["manager", "vip"])).toThrow(AccessError); // incomplete
  });
});

describe("member rules", () => {
  it("validates subjects", () => {
    expect(validateSubject(` ${ADDR_A.toUpperCase()} `)).toBe(ADDR_A);
    expect(validateSubject("did:privy:abc")).toBe("did:privy:abc");
    expect(validateSubject("0x75ED5982B7948E676892d9052DF8e6cceE1A301b")).toBe("0x75ed5982b7948e676892d9052df8e6ccee1a301b");
    expect(() => validateSubject("0x1234")).toThrow(AccessError);
    expect(() => validateSubject("cosmos1nope")).toThrow(AccessError);
    expect(() => validateSubject("dev-owner")).toThrow(AccessError);
  });

  it("adds members with roles below the actor", () => {
    const data = world();
    const next = addMember(data, actor(data, ALICE), { subject: ADDR_B, roleIds: ["helper"], note: "friend" });
    expect(next.members.find((m) => m.subject === ADDR_B)).toMatchObject({ roleIds: ["helper"], note: "friend", addedBy: ALICE });
    forbidden(() => addMember(data, actor(data, BOB), { subject: ADDR_B, roleIds: ["helper"] }));
    forbidden(() => addMember(data, actor(data, ALICE), { subject: OWNER }));
  });

  it("only changes roles that are below you, on members below you", () => {
    const data = world();
    const alice = actor(data, ALICE);
    expect(setMemberRoles(data, alice, BOB, ["helper", "vip"]).members.find((m) => m.subject === BOB)!.roleIds).toEqual([
      "helper",
      "vip",
    ]);
    forbidden(() => setMemberRoles(data, alice, BOB, ["manager"]));
    forbidden(() => setMemberRoles(data, actor(data, BOB), ALICE, [])); // above
    forbidden(() => setMemberRoles(data, alice, ALICE, [])); // self, same rank
  });

  it("bans and removes only lower-ranked members", () => {
    const data = world();
    const alice = actor(data, ALICE);
    const banned = setBanned(data, alice, BOB, true);
    expect(resolveAccess({ userId: BOB, cosmosAddress: null }, banned, OWNER).banned).toBe(true);

    // A brand-new subject gets an entry just for the ban.
    const fresh = setBanned(data, alice, ADDR_B, true);
    expect(fresh.members.find((m) => m.subject === ADDR_B)).toMatchObject({ banned: true, roleIds: [] });

    forbidden(() => setBanned(data, actor(data, BOB), ALICE, true));
    forbidden(() => setBanned(data, alice, OWNER, true));
    // Bob can manage members but not bans, so he can't lift one by removing the entry.
    const bannedVip = setBanned(data, alice, ADDR_A, true);
    forbidden(() => removeMember(bannedVip, actor(bannedVip, BOB), ADDR_A));
    expect(removeMember(data, actor(data, BOB), ADDR_A).members.some((m) => m.subject === ADDR_A)).toBe(false);
  });
});

describe("JsonAccessStore", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "access-"));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("seeds defaults without writing until the first update", async () => {
    const file = path.join(dir, "nested", "access.json");
    const store = new JsonAccessStore({ file });
    expect((await store.read()).roles.map((r) => r.id)).toContain("admin");
    expect(fs.existsSync(file)).toBe(false);

    await store.update((d) => d);
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.readdirSync(path.dirname(file))).toEqual(["access.json"]); // no temp files left
  });

  it("imports legacy public roles once", async () => {
    const legacy = path.join(dir, "roles.json");
    fs.writeFileSync(legacy, JSON.stringify([{ id: "old", name: "Old", color: "#123456", permissions: { build: true } }]));
    const store = new JsonAccessStore({ file: path.join(dir, "access.json"), legacyRolesFile: legacy });
    expect((await store.read()).roles.map((r) => r.id)).toEqual(["old", "everyone"]);
  });

  it("serialises concurrent updates", async () => {
    const store = new JsonAccessStore({ file: path.join(dir, "access.json") });
    const subjects = Array.from({ length: 10 }, (_, i) => `did:privy:user${i}`);
    await Promise.all(
      subjects.map((subject) =>
        store.update(async (d) => {
          await new Promise((r) => setTimeout(r, Math.random() * 5));
          return { ...d, members: [...d.members, { subject, roleIds: [], addedAt: 1 }] };
        }),
      ),
    );
    expect((await store.read()).members.map((m) => m.subject).sort()).toEqual(subjects.sort());
  });

  it("sees writes from another process (another store on the same file)", async () => {
    const file = path.join(dir, "access.json");
    const a = new JsonAccessStore({ file });
    const b = new JsonAccessStore({ file });
    await a.read();
    await b.update((d) => ({ ...d, members: [{ subject: ALICE, roleIds: ["admin"], addedAt: 1 }] }));
    expect((await a.read()).members.map((m) => m.subject)).toEqual([ALICE]);
  });

  it("refuses a corrupt file instead of resetting it", async () => {
    const file = path.join(dir, "access.json");
    fs.writeFileSync(file, "{ nope");
    await expect(new JsonAccessStore({ file }).read()).rejects.toThrow("Can't read");
  });
});

describe("requirePermission", () => {
  const saved = { ...process.env };
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "access-perm-"));
    setAccessStore(new JsonAccessStore({ file: path.join(dir, "access.json") }));
  });
  afterEach(() => {
    process.env = { ...saved };
    setAccessStore(null);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("lets the dev user build when it is the owner (the local default)", async () => {
    process.env.AWE_AUTH_MODE = "dev";
    delete process.env.AWE_OWNER_ID;
    const { requirePermission } = await import("../src/server/access");
    await expect(requirePermission("build")).resolves.toMatchObject({ isOwner: true });
  });

  it("refuses the dev user when someone else owns the world", async () => {
    process.env.AWE_AUTH_MODE = "dev";
    process.env.AWE_OWNER_ID = OWNER;
    const { requirePermission } = await import("../src/server/access");
    await expect(requirePermission("build")).rejects.toThrow('"Build"');
  });
});
