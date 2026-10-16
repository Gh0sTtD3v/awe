import { PERMISSION_IDS, isPermission, type Permission } from "./permissions";
import {
  EVERYONE_ROLE_ID,
  type AccessData,
  type Member,
  type ResolvedAccess,
  type Role,
} from "./types";

/**
 * Pure access resolution and data normalisation. Isomorphic, no I/O.
 */

export interface Subject {
  userId: string | null;
  /** The Keplr address linked to `userId`, if any. */
  cosmosAddress: string | null;
}

/** Cosmos addresses are case-insensitive bech32; store them lowercase. DIDs are kept as-is. */
export function normalizeSubject(subject: string): string {
  const trimmed = subject.trim();
  return /^cosmos1/i.test(trimmed) ? trimmed.toLowerCase() : trimmed;
}

function subjectsOf(subject: Subject): string[] {
  const out: string[] = [];
  if (subject.userId) out.push(normalizeSubject(subject.userId));
  if (subject.cosmosAddress) out.push(normalizeSubject(subject.cosmosAddress));
  return out;
}

/** Member entries that apply to this person: by DID or by linked address. */
export function membersFor(subject: Subject, data: AccessData): Member[] {
  const ids = subjectsOf(subject);
  if (ids.length === 0) return [];
  return data.members.filter((m) => ids.includes(m.subject));
}

export function isOwnerSubject(subject: Subject, ownerId: string | null): boolean {
  if (!ownerId) return false;
  return subjectsOf(subject).includes(normalizeSubject(ownerId));
}

/** Roles sorted highest first. */
export function sortRoles(roles: Role[]): Role[] {
  return [...roles].sort((a, b) => b.position - a.position);
}

export function resolveAccess(
  subject: Subject,
  data: AccessData,
  ownerId: string | null,
): ResolvedAccess {
  if (isOwnerSubject(subject, ownerId)) {
    return {
      isOwner: true,
      banned: false,
      // The owner sits above every role rather than holding any.
      roleIds: [EVERYONE_ROLE_ID],
      permissions: [...PERMISSION_IDS],
      topPosition: Infinity,
    };
  }

  const members = membersFor(subject, data);
  const assigned = new Set(members.flatMap((m) => m.roleIds));
  assigned.add(EVERYONE_ROLE_ID);

  const held = sortRoles(data.roles).filter((r) => assigned.has(r.id));
  const granted = new Set<Permission>();
  for (const role of held) {
    for (const [perm, on] of Object.entries(role.permissions)) {
      if (on && isPermission(perm)) granted.add(perm);
    }
  }

  return {
    isOwner: false,
    banned: members.some((m) => m.banned),
    roleIds: held.map((r) => r.id),
    permissions: granted.has("administrator") ? [...PERMISSION_IDS] : [...granted],
    topPosition: held.length ? Math.max(...held.map((r) => r.position)) : 0,
  };
}

export function hasPermission(access: ResolvedAccess, permission: Permission): boolean {
  return access.permissions.includes(permission);
}

/** Access implied by a member record alone, for hierarchy checks against a target. */
export function resolveMember(subject: string, data: AccessData, ownerId: string | null): ResolvedAccess {
  return resolveAccess(
    /^cosmos1/i.test(subject)
      ? { userId: null, cosmosAddress: subject }
      : { userId: subject, cosmosAddress: null },
    data,
    ownerId,
  );
}

// ── Defaults & normalisation ────────────────────────────────────────────────

export function everyoneRole(permissions: Role["permissions"] = { speak: true }): Role {
  return { id: EVERYONE_ROLE_ID, name: "everyone", color: "#99aab5", position: 0, permissions };
}

/** The starting point for a new world. Everything but `everyone` is deletable. */
export function defaultAccessData(): AccessData {
  return normalizeAccessData({
    version: 1,
    roles: [
      { id: "admin", name: "Admin", color: "#e74c3c", position: 4, permissions: { administrator: true } },
      {
        id: "moderator",
        name: "Moderator",
        color: "#3498db",
        position: 3,
        permissions: { kick_members: true, ban_members: true, mute_members: true, speak: true, control_screens: true },
      },
      { id: "builder", name: "Builder", color: "#2ecc71", position: 2, permissions: { build: true, upload_assets: true } },
      { id: "speaker", name: "Speaker", color: "#f1c40f", position: 1, permissions: { speak: true } },
      everyoneRole(),
    ],
    members: [],
  });
}

function normalizePermissions(raw: unknown): Role["permissions"] {
  const out: Role["permissions"] = {};
  if (!raw || typeof raw !== "object") return out;
  const source = raw as Record<string, unknown>;

  // Legacy flag from the first roles UI.
  if (source.moderate) {
    out.kick_members = true;
    out.ban_members = true;
  }
  for (const [key, value] of Object.entries(source)) {
    if (isPermission(key) && value) out[key] = true;
  }
  return out;
}

/**
 * Repair anything read from disk or sent by a client: drop unknown
 * permissions, guarantee `everyone` at position 0, renumber positions to a
 * dense 1..n above it in their current order, drop references to missing roles.
 */
export function normalizeAccessData(raw: unknown): AccessData {
  const source = (raw && typeof raw === "object" ? raw : {}) as Partial<AccessData>;
  const rawRoles = Array.isArray(source.roles) ? source.roles : [];

  const seen = new Set<string>();
  let everyone: Role | null = null;
  const others: Role[] = [];

  rawRoles.forEach((r: any, index: number) => {
    if (!r || typeof r.id !== "string" || !r.id || seen.has(r.id)) return;
    seen.add(r.id);
    const role: Role = {
      id: r.id,
      name: typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 64) : "new role",
      color: typeof r.color === "string" ? r.color : "#99aab5",
      // Legacy roles had no position: earlier in the list ranks higher.
      position: typeof r.position === "number" && isFinite(r.position) ? r.position : rawRoles.length - index,
      permissions: normalizePermissions(r.permissions),
    };
    if (role.id === EVERYONE_ROLE_ID) everyone = role;
    else others.push(role);
  });

  const ranked = sortRoles(others).map((role, i, all) => ({ ...role, position: all.length - i }));
  const roles = [...ranked, { ...everyoneRole((everyone as Role | null)?.permissions), position: 0 }];
  const roleIds = new Set(roles.map((r) => r.id));

  const bySubject = new Map<string, Member>();
  for (const m of Array.isArray(source.members) ? source.members : []) {
    if (!m || typeof (m as any).subject !== "string" || !(m as any).subject.trim()) continue;
    const subject = normalizeSubject((m as any).subject);
    const prev = bySubject.get(subject);
    const member: Member = {
      subject,
      roleIds: [
        ...new Set(
          (Array.isArray(m.roleIds) ? m.roleIds : []).filter(
            (id): id is string => typeof id === "string" && roleIds.has(id) && id !== EVERYONE_ROLE_ID,
          ),
        ),
      ],
      ...(m.banned ? { banned: true } : {}),
      ...(typeof m.note === "string" && m.note ? { note: m.note.slice(0, 200) } : {}),
      ...(typeof m.addedBy === "string" ? { addedBy: m.addedBy } : {}),
      addedAt: typeof m.addedAt === "number" ? m.addedAt : Date.now(),
    };
    // Duplicate subjects merge rather than silently shadowing each other.
    bySubject.set(
      subject,
      prev
        ? {
            ...prev,
            roleIds: [...new Set([...prev.roleIds, ...member.roleIds])],
            ...(prev.banned || member.banned ? { banned: true } : {}),
          }
        : member,
    );
  }

  return { version: 1, roles, members: [...bySubject.values()] };
}
