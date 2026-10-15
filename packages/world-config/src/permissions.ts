/**
 * The permission catalog.
 *
 * Deliberately lives in code rather than in the stored world file: adding a
 * permission should never require migrating data. Stored roles reference
 * permissions by slug and simply ignore slugs they don't know about.
 *
 * Permissions are stored as string arrays rather than a bitfield. Discord uses
 * a bitfield for wire size; here the sets are small and readable, diffable
 * JSON is worth more than the bytes.
 */

export type PermissionScope = "world" | "chunk";

export interface PermissionDef {
	slug: string;
	label: string;
	description: string;
	scope: PermissionScope;
}

export const PERMISSIONS: readonly PermissionDef[] = [
	{
		slug: "administrator",
		label: "Administrator",
		description:
			"Grants every permission and bypasses all per-chunk overrides. Only the world owner can grant this.",
		scope: "world",
	},
	{
		slug: "manage_roles",
		label: "Manage Roles",
		description:
			"Create, edit, reorder and delete roles below their own, and assign them to members.",
		scope: "world",
	},
	{
		slug: "manage_world",
		label: "Manage World",
		description: "Change world-wide settings and reassign chunk ownership.",
		scope: "world",
	},
	{
		slug: "upload",
		label: "Upload Assets",
		description: "Upload models, images and other assets to the world.",
		scope: "world",
	},
	{
		slug: "view",
		label: "View Chunk",
		description: "Enter a chunk and see what is in it.",
		scope: "chunk",
	},
	{
		slug: "build",
		label: "Build",
		description: "Add, move and edit objects in a chunk.",
		scope: "chunk",
	},
	{
		slug: "manage_chunk",
		label: "Manage Chunk",
		description:
			"Edit a chunk's info and its per-role permission overwrites.",
		scope: "chunk",
	},
	{
		slug: "speak",
		label: "Speak",
		description: "Use voice chat within a chunk.",
		scope: "chunk",
	},
	{
		slug: "moderate",
		label: "Moderate Members",
		description: "Kick or mute other members in a chunk.",
		scope: "chunk",
	},
] as const;

export type Permission = (typeof PERMISSIONS)[number]["slug"];

export const ALL_PERMISSIONS: readonly string[] = PERMISSIONS.map((p) => p.slug);

export const CHUNK_PERMISSIONS: readonly string[] = PERMISSIONS.filter(
	(p) => p.scope === "chunk",
).map((p) => p.slug);

export const WORLD_PERMISSIONS: readonly string[] = PERMISSIONS.filter(
	(p) => p.scope === "world",
).map((p) => p.slug);

const BY_SLUG = new Map(PERMISSIONS.map((p) => [p.slug, p]));

export function isPermission(slug: string): boolean {
	return BY_SLUG.has(slug);
}

export function permissionDef(slug: string): PermissionDef | null {
	return BY_SLUG.get(slug) ?? null;
}

/**
 * Permissions that a granted permission necessarily implies. Expanded once
 * inside the resolver so callers never have to remember that `build` is
 * useless without `view`.
 */
const IMPLIES: Record<string, readonly string[]> = {
	build: ["view"],
	manage_chunk: ["view"],
	moderate: ["view"],
	speak: ["view"],
};

/** Expand a permission set to include everything its members imply. */
export function expandImplied(perms: Set<string>): Set<string> {
	if (perms.has("administrator")) return new Set(ALL_PERMISSIONS);

	const out = new Set(perms);
	for (const perm of perms) {
		for (const implied of IMPLIES[perm] ?? []) out.add(implied);
	}
	return out;
}

/** Drop anything that isn't a known permission slug. */
export function sanitizePermissions(
	slugs: readonly string[] | undefined,
): string[] {
	if (!Array.isArray(slugs)) return [];
	return [...new Set(slugs.filter(isPermission))];
}
