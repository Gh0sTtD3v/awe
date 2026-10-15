import {
	ALL_PERMISSIONS,
	CHUNK_PERMISSIONS,
	expandImplied,
	sanitizePermissions,
} from "./permissions";
import type {
	ChunkConfig,
	PermissionOverwrite,
	Role,
	WorldConfig,
} from "./types";

/**
 * Permission resolution, following Discord's model.
 *
 * Pure and dependency-free on purpose: the authenticated chunk route, the
 * Colyseus server and the studio UI all call this, so a control the UI offers
 * can never disagree with what the server will allow.
 */

export type PermissionSet = ReadonlySet<string>;

export function roleById(world: WorldConfig, roleId: string): Role | null {
	return world.roles.find((r) => r.id === roleId) ?? null;
}

/** The role ids a user holds, ignoring any that no longer exist. */
export function rolesOf(world: WorldConfig, userId: string | null): string[] {
	if (!userId) return [];
	const held = world.members?.[userId] ?? [];
	return held.filter((id) => !!roleById(world, id));
}

/**
 * World-wide permissions, before any per-chunk overwrite.
 * The owner and anyone with `administrator` short-circuit to everything.
 */
export function computeBasePermissions(
	world: WorldConfig,
	userId: string | null,
): PermissionSet {
	if (userId && world.ownerId && userId === world.ownerId) {
		return new Set(ALL_PERMISSIONS);
	}

	const perms = new Set(sanitizePermissions(world.everyone?.allow));

	for (const roleId of rolesOf(world, userId)) {
		for (const perm of sanitizePermissions(roleById(world, roleId)?.allow)) {
			perms.add(perm);
		}
	}

	return expandImplied(perms);
}

/**
 * Implications are expanded when a permission is *granted*, never after denies
 * have been applied — otherwise denying `view` would be undone by the `speak`
 * the user still holds, since `speak` implies `view`.
 */
function grant(perms: Set<string>, slugs: readonly string[]) {
	for (const perm of expandImplied(new Set(sanitizePermissions(slugs)))) {
		perms.add(perm);
	}
}

function applyOverwrite(
	perms: Set<string>,
	overwrite: PermissionOverwrite | undefined,
) {
	if (!overwrite) return;
	for (const perm of sanitizePermissions(overwrite.deny)) perms.delete(perm);
	grant(perms, overwrite.allow ?? []);
}

/**
 * Effective permissions for a user in a chunk.
 *
 * Order matters and mirrors Discord exactly:
 *   1. administrator / world owner short-circuits to everything
 *   2. chunk owner gets every *chunk-scoped* permission — never world ones,
 *      so owning a chunk can't escalate into managing the world's roles
 *   3. the @everyone overwrite
 *   4. role overwrites: all denies accumulate first, then all allows, so a
 *      single role granting a permission beats another role denying it
 *   5. the member-specific overwrite, which wins over everything above
 */
export function resolvePermissions(opts: {
	world: WorldConfig;
	chunk?: ChunkConfig | null;
	userId: string | null;
}): PermissionSet {
	const { world, chunk, userId } = opts;

	const base = computeBasePermissions(world, userId);
	if (base.has("administrator")) return base;
	if (!chunk) return base;

	if (userId && chunk.ownerId && chunk.ownerId === userId) {
		return new Set([...base, ...CHUNK_PERMISSIONS]);
	}

	const perms = new Set(base);
	const overwrites = chunk.overwrites ?? {};

	applyOverwrite(perms, overwrites.everyone);

	const held = rolesOf(world, userId);
	const roleAllow = new Set<string>();
	const roleDeny = new Set<string>();

	for (const roleId of held) {
		const overwrite = overwrites.roles?.[roleId];
		if (!overwrite) continue;
		for (const perm of sanitizePermissions(overwrite.deny)) roleDeny.add(perm);
		for (const perm of sanitizePermissions(overwrite.allow)) roleAllow.add(perm);
	}

	for (const perm of roleDeny) perms.delete(perm);
	grant(perms, [...roleAllow]);

	if (userId) applyOverwrite(perms, overwrites.members?.[userId]);

	return perms;
}

export function can(perms: PermissionSet, permission: string): boolean {
	return perms.has(permission);
}

/** Convenience for the common "may this user enter this chunk" question. */
export function canViewChunk(
	world: WorldConfig,
	chunk: ChunkConfig | null,
	userId: string | null,
): boolean {
	return resolvePermissions({ world, chunk, userId }).has("view");
}

/**
 * Resolve against many chunks at once — used to filter the portal directory
 * and the chunk list down to what a user is allowed to see.
 */
export function resolveMany(opts: {
	world: WorldConfig;
	chunks: Record<string, ChunkConfig>;
	userId: string | null;
}): Record<string, PermissionSet> {
	const { world, chunks, userId } = opts;
	const out: Record<string, PermissionSet> = {};

	for (const [key, chunk] of Object.entries(chunks)) {
		out[key] = resolvePermissions({ world, chunk, userId });
	}

	return out;
}
