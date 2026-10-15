import { sanitizePermissions } from "./permissions";
import {
	WORLD_CONFIG_VERSION,
	defaultChunkConfig,
	defaultChunkInfo,
	defaultWorldConfig,
} from "./types";
import type {
	ChunkConfig,
	ChunkConfigMap,
	Role,
	WorldConfig,
} from "./types";

/**
 * Migration from the first-pass shapes to the world/chunk model.
 *
 * Both functions are idempotent — they accept already-migrated input and
 * return it normalised, so they can run on every read without a version dance.
 */

/** The original flat role shape, stored as an array in `roles.json`. */
interface LegacyRole {
	id: string;
	name: string;
	color: string;
	permissions?: {
		administrator?: boolean;
		moderate?: boolean;
		speak?: boolean;
		build?: boolean;
	};
}

/** The original per-chunk shape: an allowlist of role ids, empty meaning public. */
interface LegacyChunkConfig {
	info?: Record<string, any>;
	auth?: string[];
}

function legacyPermissionsToAllow(role: LegacyRole): string[] {
	const permissions = role.permissions ?? {};
	const allow: string[] = [];

	if (permissions.administrator) allow.push("administrator");
	if (permissions.moderate) allow.push("moderate");
	if (permissions.speak) allow.push("speak");
	// The old "build" implied being able to see what you're building in.
	if (permissions.build) allow.push("build", "view");

	return sanitizePermissions(allow);
}

function normalizeRole(input: any): Role | null {
	if (!input?.id) return null;

	// Already migrated if it carries `allow`; otherwise map the legacy flags.
	const allow = Array.isArray(input.allow)
		? sanitizePermissions(input.allow)
		: legacyPermissionsToAllow(input as LegacyRole);

	return {
		id: String(input.id),
		name: typeof input.name === "string" ? input.name : "new role",
		color: typeof input.color === "string" ? input.color : "#99aab5",
		allow,
	};
}

/**
 * Build a world config from whatever is on disk.
 *
 * `legacyRoles` is the old `roles.json` array, whose order already encoded
 * hierarchy — index 0 stays the highest role.
 */
export function migrateWorldConfig(opts: {
	stored?: Partial<WorldConfig> | null;
	legacyRoles?: unknown;
}): WorldConfig {
	const base = defaultWorldConfig();
	const stored = opts.stored ?? null;

	const rolesSource = Array.isArray(stored?.roles)
		? stored.roles
		: Array.isArray(opts.legacyRoles)
			? opts.legacyRoles
			: [];

	const roles = (rolesSource as any[])
		.map(normalizeRole)
		.filter((r): r is Role => !!r);

	// Ids must be unique — a duplicate would make hierarchy ambiguous.
	const seen = new Set<string>();
	const uniqueRoles = roles.filter((r) => {
		if (seen.has(r.id)) return false;
		seen.add(r.id);
		return true;
	});

	const members: Record<string, string[]> = {};
	const roleIds = new Set(uniqueRoles.map((r) => r.id));

	for (const [userId, held] of Object.entries(stored?.members ?? {})) {
		if (!Array.isArray(held)) continue;
		// Drop dangling references to roles that no longer exist.
		const kept = [...new Set(held.filter((id) => roleIds.has(id)))];
		if (kept.length) members[userId] = kept;
	}

	return {
		version: WORLD_CONFIG_VERSION,
		ownerId: stored?.ownerId ?? base.ownerId,
		everyone: {
			color: stored?.everyone?.color ?? base.everyone.color,
			allow: Array.isArray(stored?.everyone?.allow)
				? sanitizePermissions(stored.everyone.allow)
				: base.everyone.allow,
		},
		roles: uniqueRoles,
		members,
		updatedAt: typeof stored?.updatedAt === "number" ? stored.updatedAt : 0,
	};
}

/**
 * Translate one legacy `auth` allowlist into overwrites with identical
 * meaning: an empty list was public, a non-empty one restricted entry to
 * exactly those roles.
 */
function authToOverwrites(auth: string[]): ChunkConfig["overwrites"] {
	if (!auth.length) return {};

	const roles: Record<string, { allow: string[]; deny: string[] }> = {};
	for (const roleId of auth) {
		roles[roleId] = { allow: ["view"], deny: [] };
	}

	return {
		everyone: { allow: [], deny: ["view"] },
		roles,
	};
}

function normalizeChunkConfig(input: any): ChunkConfig {
	const base = defaultChunkConfig();
	if (!input) return base;

	// Legacy entries carry `auth` and no `overwrites`.
	const overwrites =
		input.overwrites ??
		(Array.isArray(input.auth)
			? authToOverwrites((input as LegacyChunkConfig).auth!)
			: {});

	return {
		ownerId: input.ownerId ?? null,
		info: { ...defaultChunkInfo(), ...(input.info ?? {}) },
		overwrites,
		// Deliberately never seeded from the chunk files on disk: those hold a
		// full copy of the world defaults, and importing them would pin every
		// default into every chunk permanently.
		presets:
			input.presets && typeof input.presets === "object" ? input.presets : {},
		updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : 0,
	};
}

export function migrateChunkConfigMap(stored: unknown): ChunkConfigMap {
	if (!stored || typeof stored !== "object") return {};

	const out: ChunkConfigMap = {};
	for (const [key, value] of Object.entries(stored as Record<string, any>)) {
		out[key] = normalizeChunkConfig(value);
	}

	return out;
}

export function normalizeChunk(input: unknown): ChunkConfig {
	return normalizeChunkConfig(input);
}
