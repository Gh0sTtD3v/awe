import { isCosmosAddress } from "../keplr-auth";
import { PERMISSIONS, PERMISSION_IDS, type Permission } from "./permissions";
import {
  hasPermission,
  normalizeAccessData,
  normalizeSubject,
  resolveMember,
  sortRoles,
} from "./resolve";
import { EVERYONE_ROLE_ID, type AccessData, type Member, type ResolvedAccess, type Role } from "./types";

/**
 * Every change to roles and members, as pure functions of the current data.
 * Each enforces the Discord-style hierarchy on the server — the UI only
 * mirrors these rules:
 *
 * - you act only on roles ranked below your highest role (the owner is above all)
 * - you grant or revoke only permissions you hold yourself
 * - you act only on members ranked below you, and never on the owner
 */

export type AccessErrorCode = "forbidden" | "invalid" | "not_found";

export class AccessError extends Error {
  constructor(
    readonly code: AccessErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AccessError";
  }
}

export interface ActorContext {
  access: ResolvedAccess;
  /** Who is acting, recorded as `addedBy`. */
  actorId: string | null;
  ownerId: string | null;
}

const MAX_ROLES = 100;

function labelOf(permission: Permission): string {
  return PERMISSIONS.find((p) => p.id === permission)?.label ?? permission;
}

export function requirePermissionIn(access: ResolvedAccess, permission: Permission): void {
  if (!hasPermission(access, permission)) {
    throw new AccessError("forbidden", `You need the "${labelOf(permission)}" permission.`);
  }
}

export function canManageRole(access: ResolvedAccess, role: Role): boolean {
  return access.isOwner || role.position < access.topPosition;
}

function assertCanManageRole(access: ResolvedAccess, role: Role): void {
  if (!canManageRole(access, role)) {
    throw new AccessError("forbidden", `"${role.name}" is not below your highest role.`);
  }
}

function findRole(data: AccessData, id: string): Role {
  const role = data.roles.find((r) => r.id === id);
  if (!role) throw new AccessError("not_found", "That role no longer exists.");
  return role;
}

/** Turning a permission on or off requires holding it. */
function assertPermissionChangesHeld(
  access: ResolvedAccess,
  before: Role["permissions"],
  after: Role["permissions"],
): void {
  for (const id of PERMISSION_IDS) {
    if (!!before[id] !== !!after[id] && !hasPermission(access, id)) {
      throw new AccessError("forbidden", `You can't change "${labelOf(id)}" without holding it.`);
    }
  }
}

function cleanPermissions(raw: unknown): Role["permissions"] {
  const out: Role["permissions"] = {};
  if (!raw || typeof raw !== "object") return out;
  for (const id of PERMISSION_IDS) if ((raw as any)[id]) out[id] = true;
  return out;
}

function cleanName(name: unknown, fallback: string): string {
  if (typeof name !== "string" || !name.trim()) return fallback;
  return name.trim().slice(0, 64);
}

function cleanColor(color: unknown, fallback: string): string {
  return typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}

// ── Roles ────────────────────────────────────────────────────────────────────

export interface RoleInput {
  name?: string;
  color?: string;
  permissions?: Role["permissions"];
}

/** New roles start at the bottom, just above `everyone`, as in Discord. */
export function createRole(data: AccessData, ctx: ActorContext, input: RoleInput): { data: AccessData; role: Role } {
  requirePermissionIn(ctx.access, "manage_roles");
  if (data.roles.length >= MAX_ROLES) throw new AccessError("invalid", `A world can have at most ${MAX_ROLES} roles.`);

  const permissions = cleanPermissions(input.permissions);
  assertPermissionChangesHeld(ctx.access, {}, permissions);

  const role: Role = {
    id: globalThis.crypto.randomUUID(),
    name: cleanName(input.name, "new role"),
    color: cleanColor(input.color, "#99aab5"),
    position: 0.5,
    permissions,
  };
  // Everything above `everyone` moves up one, so any real role stays above the
  // new one. Holding the permission only through `everyone` isn't enough.
  if (!ctx.access.isOwner && ctx.access.topPosition < 1) {
    throw new AccessError("forbidden", "You need a role above the new one to create roles.");
  }

  const next = normalizeAccessData({ ...data, roles: [...data.roles, role] });
  return { data: next, role: next.roles.find((r) => r.id === role.id)! };
}

export function updateRole(data: AccessData, ctx: ActorContext, id: string, patch: RoleInput): AccessData {
  requirePermissionIn(ctx.access, "manage_roles");
  const role = findRole(data, id);
  assertCanManageRole(ctx.access, role);

  const permissions = patch.permissions ? cleanPermissions(patch.permissions) : role.permissions;
  assertPermissionChangesHeld(ctx.access, role.permissions, permissions);

  const updated: Role = {
    ...role,
    name: id === EVERYONE_ROLE_ID ? role.name : cleanName(patch.name ?? role.name, role.name),
    color: cleanColor(patch.color ?? role.color, role.color),
    permissions,
  };
  return normalizeAccessData({ ...data, roles: data.roles.map((r) => (r.id === id ? updated : r)) });
}

/** Also strips the role from every member (chunk access lists are the caller's job). */
export function deleteRole(data: AccessData, ctx: ActorContext, id: string): AccessData {
  requirePermissionIn(ctx.access, "manage_roles");
  if (id === EVERYONE_ROLE_ID) throw new AccessError("invalid", "The everyone role can't be deleted.");
  const role = findRole(data, id);
  assertCanManageRole(ctx.access, role);
  // A role with permissions you lack can't be deleted either: that would be a way to revoke them.
  assertPermissionChangesHeld(ctx.access, role.permissions, {});

  return normalizeAccessData({ ...data, roles: data.roles.filter((r) => r.id !== id) });
}

/**
 * `order` lists every role except `everyone`, highest first. Roles at or above
 * the actor's highest role must stay exactly where they are.
 */
export function reorderRoles(data: AccessData, ctx: ActorContext, order: string[]): AccessData {
  requirePermissionIn(ctx.access, "manage_roles");

  const current = sortRoles(data.roles).filter((r) => r.id !== EVERYONE_ROLE_ID);
  const unique = new Set(order);
  if (
    unique.size !== order.length ||
    order.length !== current.length ||
    !current.every((r) => unique.has(r.id))
  ) {
    throw new AccessError("invalid", "The role list changed. Reload and try again.");
  }

  if (!ctx.access.isOwner) {
    const locked = current.filter((r) => !canManageRole(ctx.access, r)).map((r) => r.id);
    if (locked.some((id, i) => order[i] !== id)) {
      throw new AccessError("forbidden", "You can only reorder roles below your highest role.");
    }
  }

  const byId = new Map(data.roles.map((r) => [r.id, r]));
  const roles = order.map((id, i) => ({ ...byId.get(id)!, position: order.length - i }));
  roles.push(byId.get(EVERYONE_ROLE_ID)!);
  return normalizeAccessData({ ...data, roles });
}

// ── Members ──────────────────────────────────────────────────────────────────

/** A Privy DID, a Cosmos address or an Ethereum address; anything else can never match a person. */
export function validateSubject(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new AccessError("invalid", "Enter a Privy user id, cosmos1… address or 0x… wallet.");
  }
  const subject = normalizeSubject(raw);
  if (subject.startsWith("did:privy:") && subject.length > "did:privy:".length) return subject;
  if (isCosmosAddress(subject)) return subject;
  if (/^0x[0-9a-f]{40}$/.test(subject)) return subject;
  throw new AccessError("invalid", "Enter a Privy user id (did:privy:…), a valid cosmos1… address or a 0x… wallet.");
}

function assertCanManageMember(data: AccessData, ctx: ActorContext, subject: string): void {
  if (ctx.ownerId && normalizeSubject(ctx.ownerId) === subject) {
    throw new AccessError("forbidden", "The owner can't be changed.");
  }
  if (ctx.access.isOwner) return;
  const target = resolveMember(subject, data, ctx.ownerId);
  if (target.topPosition >= ctx.access.topPosition) {
    throw new AccessError("forbidden", "That member's highest role is not below yours.");
  }
}

function assertAssignable(data: AccessData, ctx: ActorContext, roleIds: string[]): void {
  for (const id of roleIds) {
    if (id === EVERYONE_ROLE_ID) throw new AccessError("invalid", "Everyone has the everyone role already.");
    assertCanManageRole(ctx.access, findRole(data, id));
  }
}

function findMember(data: AccessData, subject: string): Member {
  const member = data.members.find((m) => m.subject === subject);
  if (!member) throw new AccessError("not_found", "That member no longer exists.");
  return member;
}

export function addMember(
  data: AccessData,
  ctx: ActorContext,
  input: { subject: string; roleIds?: string[]; note?: string },
): AccessData {
  requirePermissionIn(ctx.access, "manage_members");
  const subject = validateSubject(input.subject);
  if (data.members.some((m) => m.subject === subject)) throw new AccessError("invalid", "Already a member.");
  assertCanManageMember(data, ctx, subject);

  const roleIds = [...new Set(input.roleIds ?? [])];
  assertAssignable(data, ctx, roleIds);

  const member: Member = {
    subject,
    roleIds,
    ...(input.note ? { note: input.note } : {}),
    ...(ctx.actorId ? { addedBy: ctx.actorId } : {}),
    addedAt: Date.now(),
  };
  return normalizeAccessData({ ...data, members: [...data.members, member] });
}

/** Only the roles that actually change need to be below the actor's highest role. */
export function setMemberRoles(data: AccessData, ctx: ActorContext, rawSubject: string, roleIds: string[]): AccessData {
  requirePermissionIn(ctx.access, "manage_members");
  const subject = normalizeSubject(rawSubject);
  const member = findMember(data, subject);
  assertCanManageMember(data, ctx, subject);

  const next = new Set(roleIds);
  const changed = [
    ...roleIds.filter((id) => !member.roleIds.includes(id)),
    ...member.roleIds.filter((id) => !next.has(id)),
  ];
  assertAssignable(data, ctx, changed);

  return normalizeAccessData({
    ...data,
    members: data.members.map((m) => (m.subject === subject ? { ...m, roleIds: [...next] } : m)),
  });
}

export function removeMember(data: AccessData, ctx: ActorContext, rawSubject: string): AccessData {
  requirePermissionIn(ctx.access, "manage_members");
  const subject = normalizeSubject(rawSubject);
  const member = findMember(data, subject);
  // Removing a banned entry lifts the ban.
  if (member.banned) requirePermissionIn(ctx.access, "ban_members");
  assertCanManageMember(data, ctx, subject);
  assertAssignable(data, ctx, member.roleIds);

  return normalizeAccessData({ ...data, members: data.members.filter((m) => m.subject !== subject) });
}

/** Banning someone who isn't a member yet adds an entry for them. */
export function setBanned(data: AccessData, ctx: ActorContext, rawSubject: string, banned: boolean): AccessData {
  requirePermissionIn(ctx.access, "ban_members");
  const subject = validateSubject(rawSubject);
  assertCanManageMember(data, ctx, subject);

  const exists = data.members.some((m) => m.subject === subject);
  const members = exists
    ? data.members.map((m) => (m.subject === subject ? { ...m, banned } : m))
    : banned
      ? [...data.members, { subject, roleIds: [], banned: true, addedAt: Date.now(), ...(ctx.actorId ? { addedBy: ctx.actorId } : {}) }]
      : data.members;
  return normalizeAccessData({ ...data, members });
}
