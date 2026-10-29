"use server";

import { getIdentity } from "../server/auth-service";
import { GameService } from "../server/game-service";
import { getProfileStore } from "../server/profiles";
import {
  AccessError,
  accessFor,
  addMember as addMemberRule,
  createRole as createRoleRule,
  currentActor,
  deleteRole as deleteRoleRule,
  getAccessStore,
  getOwnerId,
  hasPermission,
  removeMember as removeMemberRule,
  reorderRoles as reorderRolesRule,
  setBanned as setBannedRule,
  setMemberRoles as setMemberRolesRule,
  sortRoles,
  updateRole as updateRoleRule,
  type AccessData,
  type ActorContext,
  type Member,
  type Permission,
  type Role,
  type RoleInput,
} from "../server/access";

/**
 * Roles and members, for the studio Settings panel. Every action re-checks the
 * caller server-side; the UI's disabled buttons are only a courtesy.
 *
 * Results carry the refusal reason instead of throwing, because Next strips
 * error messages from server actions in production.
 */

export type AccessResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface MyAccess {
  signedIn: boolean;
  userId: string | null;
  isOwner: boolean;
  banned: boolean;
  permissions: Permission[];
  roleIds: string[];
  /** Highest held role position; `null` means above every role (the owner). */
  topPosition: number | null;
}

export interface AccessOverview {
  ownerId: string | null;
  roles: Role[];
  members: Member[];
  me: MyAccess;
  /** Usernames and pictures of members (and the owner) who made a profile, by subject. */
  profiles: Record<string, { username: string | null; avatarUrl: string | null }>;
}

function toMyAccess(userId: string | null, access: Awaited<ReturnType<typeof accessFor>>): MyAccess {
  return {
    signedIn: !!userId,
    userId,
    isOwner: access.isOwner,
    banned: access.banned,
    permissions: access.permissions,
    roleIds: access.roleIds,
    // Infinity doesn't survive serialisation.
    topPosition: Number.isFinite(access.topPosition) ? access.topPosition : null,
  };
}

async function run<T>(fn: () => Promise<T>): Promise<AccessResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof AccessError) return { ok: false, error: err.message };
    if (err instanceof Error && err.message === "Not authenticated") {
      return { ok: false, error: "Sign in first." };
    }
    console.error("[Access]", err);
    return { ok: false, error: "Something went wrong. Check the server log." };
  }
}

/** What the caller may do. Never throws: signed-out callers get `everyone`. */
export async function getMyAccess(): Promise<MyAccess> {
  const identity = await getIdentity();
  return toMyAccess(identity?.userId ?? null, await accessFor(identity));
}

/** Role definitions only — names and colours show in-game anyway. Members stay private. */
export async function listRoles(): Promise<Role[]> {
  return sortRoles((await getAccessStore().read()).roles);
}

async function overview(data: AccessData, me: MyAccess): Promise<AccessOverview> {
  const ownerId = getOwnerId();
  // Profiles are by Privy id; members added by address have none until looked up some other way.
  const profiles: AccessOverview["profiles"] = {};
  try {
    const all = (await getProfileStore().read()).profiles;
    for (const subject of [ownerId, ...data.members.map((m) => m.subject)]) {
      const p = subject ? all[subject] : undefined;
      if (p && (p.username || p.avatarUrl)) profiles[subject!] = { username: p.username, avatarUrl: p.avatarUrl };
    }
  } catch (err) {
    console.warn("[Access]", (err as Error).message);
  }
  return { ownerId, roles: sortRoles(data.roles), members: data.members, me, profiles };
}

export async function listAccess(): Promise<AccessResult<AccessOverview>> {
  return run(async () => {
    const { identity, access } = await currentActor();
    if (!hasPermission(access, "manage_roles") && !hasPermission(access, "manage_members") && !hasPermission(access, "ban_members")) {
      throw new AccessError("forbidden", "You need Manage Roles, Manage Members or Ban Members.");
    }
    return overview(await getAccessStore().read(), toMyAccess(identity.userId, access));
  });
}

/** Apply one rule-checked change and return the fresh overview. */
async function change(apply: (data: AccessData, ctx: ActorContext) => AccessData): Promise<AccessResult<AccessOverview>> {
  return run(async () => {
    const { identity, ctx } = await currentActor();
    const data = await getAccessStore().update((current) => apply(current, ctx));
    // The caller's own access may have changed (e.g. they reordered roles).
    const me = toMyAccess(identity.userId, await accessFor(identity));
    return overview(data, me);
  });
}

export async function createRole(input: RoleInput): Promise<AccessResult<AccessOverview>> {
  return change((data, ctx) => createRoleRule(data, ctx, input).data);
}

export async function updateRole(id: string, patch: RoleInput): Promise<AccessResult<AccessOverview>> {
  return change((data, ctx) => updateRoleRule(data, ctx, id, patch));
}

export async function deleteRole(id: string): Promise<AccessResult<AccessOverview>> {
  const result = await change((data, ctx) => deleteRoleRule(data, ctx, id));
  if (result.ok) await GameService.removeRoleFromChunks(id);
  return result;
}

export async function reorderRoles(order: string[]): Promise<AccessResult<AccessOverview>> {
  return change((data, ctx) => reorderRolesRule(data, ctx, order));
}

export async function addMember(input: { subject: string; roleIds?: string[]; note?: string }): Promise<AccessResult<AccessOverview>> {
  return change((data, ctx) => addMemberRule(data, ctx, input));
}

export async function setMemberRoles(subject: string, roleIds: string[]): Promise<AccessResult<AccessOverview>> {
  return change((data, ctx) => setMemberRolesRule(data, ctx, subject, roleIds));
}

export async function removeMember(subject: string): Promise<AccessResult<AccessOverview>> {
  return change((data, ctx) => removeMemberRule(data, ctx, subject));
}

export async function setBanned(subject: string, banned: boolean): Promise<AccessResult<AccessOverview>> {
  return change((data, ctx) => setBannedRule(data, ctx, subject, banned));
}
