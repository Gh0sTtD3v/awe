import { sanitizePermissions } from "./permissions";
import { computeBasePermissions, resolvePermissions, rolesOf } from "./resolve";
import { EVERYONE_ROLE_ID } from "./types";
import type { ChunkConfig, PermissionOverwrite, Role, WorldConfig } from "./types";

/**
 * Role hierarchy rules.
 *
 * A role's position in `world.roles` is both its rank and the limit of what it
 * can grant: you may only act on roles strictly below your own highest role,
 * and you may only hand out permissions you already hold.
 *
 * Every mutation is validated here, server-side. The studio calls the same
 * functions to disable controls, so the UI can't offer something the server
 * will reject.
 */

/** Lower is higher-ranked. The owner outranks everything; @everyone is last. */
export const OWNER_POSITION = -1;
export const UNRANKED_POSITION = Number.POSITIVE_INFINITY;

export interface ValidationResult {
	ok: boolean;
	reason?: string;
}

const OK: ValidationResult = { ok: true };

function fail(reason: string): ValidationResult {
	return { ok: false, reason };
}

export function rolePosition(world: WorldConfig, roleId: string): number {
	if (roleId === EVERYONE_ROLE_ID) return UNRANKED_POSITION;
	const index = world.roles.findIndex((r) => r.id === roleId);
	return index === -1 ? UNRANKED_POSITION : index;
}

/** The position of a user's highest-ranked role. */
export function actorPosition(
	world: WorldConfig,
	userId: string | null,
): number {
	if (!userId) return UNRANKED_POSITION;
	if (world.ownerId && userId === world.ownerId) return OWNER_POSITION;

	const positions = rolesOf(world, userId).map((id) => rolePosition(world, id));
	return positions.length ? Math.min(...positions) : UNRANKED_POSITION;
}

export function isOwner(world: WorldConfig, userId: string | null): boolean {
	return !!userId && !!world.ownerId && world.ownerId === userId;
}

function hasWorldPermission(
	world: WorldConfig,
	userId: string | null,
	permission: string,
): boolean {
	return computeBasePermissions(world, userId).has(permission);
}

/** Whether the actor outranks the given role and so may act on it. */
export function canManageRole(
	world: WorldConfig,
	actorId: string | null,
	roleId: string,
): boolean {
	// @everyone is not a role entry: it can't be reordered, assigned or
	// deleted. Its permissions are edited through `setEveryone` instead.
	if (roleId === EVERYONE_ROLE_ID) return false;

	if (isOwner(world, actorId)) return true;
	if (!hasWorldPermission(world, actorId, "manage_roles")) return false;

	return rolePosition(world, roleId) > actorPosition(world, actorId);
}

/**
 * Permissions the actor may hand out. You can never grant more than you hold,
 * which is what stops a moderator from minting themselves an admin role.
 */
function ungrantable(
	world: WorldConfig,
	actorId: string | null,
	slugs: readonly string[],
): string[] {
	if (isOwner(world, actorId)) return [];

	const held = computeBasePermissions(world, actorId);
	return sanitizePermissions(slugs).filter((slug) => !held.has(slug));
}

export type RoleMutation =
	| { kind: "create"; role: Role; index?: number }
	| { kind: "update"; roleId: string; patch: Partial<Role> }
	| { kind: "reorder"; roleId: string; newIndex: number }
	| { kind: "delete"; roleId: string }
	| { kind: "assign"; roleId: string; targetUserId: string }
	| { kind: "unassign"; roleId: string; targetUserId: string }
	| { kind: "setEveryone"; allow: string[] }
	| { kind: "transferOwnership"; targetUserId: string };

export function validateRoleMutation(
	world: WorldConfig,
	actorId: string | null,
	mutation: RoleMutation,
): ValidationResult {
	if (!actorId) return fail("Not authenticated.");

	const owner = isOwner(world, actorId);
	const actorPos = actorPosition(world, actorId);

	// Ownership transfer and granting administrator are owner-only, because
	// both hand over powers the actor could never otherwise delegate.
	if (mutation.kind === "transferOwnership") {
		return owner ? OK : fail("Only the world owner can transfer ownership.");
	}

	if (!owner && !hasWorldPermission(world, actorId, "manage_roles")) {
		return fail("You do not have permission to manage roles.");
	}

	switch (mutation.kind) {
		case "create": {
			const requested = sanitizePermissions(mutation.role.allow);

			if (!owner && requested.includes("administrator")) {
				return fail("Only the world owner can grant Administrator.");
			}

			const missing = ungrantable(world, actorId, requested);
			if (missing.length) {
				return fail(`You cannot grant permissions you don't have: ${missing.join(", ")}.`);
			}

			const index = mutation.index ?? world.roles.length;
			if (!owner && index <= actorPos) {
				return fail("You cannot create a role above your own highest role.");
			}

			return OK;
		}

		case "update": {
			if (!canManageRole(world, actorId, mutation.roleId)) {
				return fail("You cannot edit a role at or above your own highest role.");
			}

			const existing = world.roles.find((r) => r.id === mutation.roleId);
			if (!existing) return fail("No such role.");

			if (mutation.patch.allow) {
				const next = sanitizePermissions(mutation.patch.allow);
				const current = new Set(sanitizePermissions(existing.allow));
				// Only newly-added permissions are checked; removing something
				// from a role below you is always allowed.
				const added = next.filter((slug) => !current.has(slug));

				if (!owner && added.includes("administrator")) {
					return fail("Only the world owner can grant Administrator.");
				}

				const missing = ungrantable(world, actorId, added);
				if (missing.length) {
					return fail(`You cannot grant permissions you don't have: ${missing.join(", ")}.`);
				}
			}

			return OK;
		}

		case "reorder": {
			if (!canManageRole(world, actorId, mutation.roleId)) {
				return fail("You cannot move a role at or above your own highest role.");
			}
			if (!owner && mutation.newIndex <= actorPos) {
				return fail("You cannot move a role above your own highest role.");
			}
			return OK;
		}

		case "delete": {
			if (!canManageRole(world, actorId, mutation.roleId)) {
				return fail("You cannot delete a role at or above your own highest role.");
			}
			return OK;
		}

		case "assign":
		case "unassign": {
			if (!canManageRole(world, actorId, mutation.roleId)) {
				return fail("You cannot assign a role at or above your own highest role.");
			}

			// Removing a role from yourself is always allowed — otherwise you
			// could get stuck holding a role you want to drop.
			const selfUnassign =
				mutation.kind === "unassign" && mutation.targetUserId === actorId;

			if (!owner && !selfUnassign) {
				const targetPos = actorPosition(world, mutation.targetUserId);
				if (targetPos <= actorPos) {
					return fail("You cannot change the roles of someone at or above your own rank.");
				}
			}

			return OK;
		}

		case "setEveryone": {
			const missing = ungrantable(world, actorId, mutation.allow);
			if (missing.length) {
				return fail(`You cannot grant permissions you don't have: ${missing.join(", ")}.`);
			}
			if (!owner && sanitizePermissions(mutation.allow).includes("administrator")) {
				return fail("Only the world owner can grant Administrator.");
			}
			return OK;
		}
	}
}

/**
 * Validate a change to a chunk's permission overwrites. Requires
 * `manage_chunk` *on that chunk*, and is bounded by the same two rules: you
 * can only target roles below you, and only allow or deny what you hold there.
 */
export function validateChunkOverwriteMutation(opts: {
	world: WorldConfig;
	chunk: ChunkConfig;
	actorId: string | null;
	target: { kind: "everyone" } | { kind: "role"; roleId: string } | { kind: "member"; userId: string };
	overwrite: PermissionOverwrite;
}): ValidationResult {
	const { world, chunk, actorId, target, overwrite } = opts;

	if (!actorId) return fail("Not authenticated.");

	const perms = resolvePermissions({ world, chunk, userId: actorId });
	if (!perms.has("manage_chunk")) {
		return fail("You do not have permission to manage this chunk.");
	}

	const owner = isOwner(world, actorId);

	if (target.kind === "role" && !owner) {
		if (rolePosition(world, target.roleId) <= actorPosition(world, actorId)) {
			return fail("You cannot change overwrites for a role at or above your own rank.");
		}
	}

	if (!owner) {
		const touched = [
			...sanitizePermissions(overwrite.allow),
			...sanitizePermissions(overwrite.deny),
		];
		const missing = touched.filter((slug) => !perms.has(slug));
		if (missing.length) {
			return fail(`You cannot change permissions you don't have here: ${missing.join(", ")}.`);
		}
	}

	return OK;
}

/** Whether the actor may change who owns a chunk. */
export function canSetChunkOwner(
	world: WorldConfig,
	chunk: ChunkConfig,
	actorId: string | null,
): boolean {
	if (isOwner(world, actorId)) return true;
	if (hasWorldPermission(world, actorId, "manage_world")) return true;

	// A chunk owner may hand their own chunk to someone else.
	return !!actorId && chunk.ownerId === actorId;
}
