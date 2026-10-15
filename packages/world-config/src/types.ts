/**
 * The stored shapes of `world.json` and `chunks.json`.
 *
 * The model is Discord's: the world is the server, a chunk is a channel.
 * Roles and memberships are world-wide; each chunk layers permission
 * overwrites on top so a chunk owner can manage their own chunk without
 * touching anyone else's.
 */

export const WORLD_CONFIG_VERSION = 2;

/** The implicit base role everyone holds. Never appears in `roles[]`. */
export const EVERYONE_ROLE_ID = "everyone";

export interface Role {
	id: string;
	name: string;
	color: string;
	/** Permission slugs this role grants. */
	allow: string[];
}

export interface EveryoneRole {
	color: string;
	allow: string[];
}

export interface WorldConfig {
	version: number;
	/** Privy DID of the world owner — an implicit administrator above every role. */
	ownerId: string | null;
	everyone: EveryoneRole;
	/**
	 * Ordered by hierarchy: index 0 is the highest role. A member's position is
	 * that of their highest-ranked role, and you can only act on roles and
	 * members strictly below your own position.
	 */
	roles: Role[];
	/** userId -> role ids held. */
	members: Record<string, string[]>;
	updatedAt: number;
}

/** A Discord-style allow/deny pair layered over the world-wide permissions. */
export interface PermissionOverwrite {
	allow: string[];
	deny: string[];
}

export interface ChunkOverwrites {
	everyone?: PermissionOverwrite;
	roles?: Record<string, PermissionOverwrite>;
	members?: Record<string, PermissionOverwrite>;
}

/** Self-describing chunk metadata, surfaced in the in-game info UI. */
export interface ChunkInfo {
	title: string;
	owner?: string;
	tags?: string[];
	image?: string;
	description?: string;
	[key: string]: unknown;
}

export interface ChunkConfig {
	/** Privy DID of the chunk owner. Null means the world owner. */
	ownerId: string | null;
	info: ChunkInfo;
	overwrites: ChunkOverwrites;
	/**
	 * Per-chunk preset overrides, keyed by component id. Each value holds only
	 * the data keys that differ from the world default in `static-scene.json`.
	 */
	presets: Record<string, Record<string, any>>;
	updatedAt: number;
}

export type ChunkConfigMap = Record<string, ChunkConfig>;

export function defaultChunkInfo(): ChunkInfo {
	return { title: "Info" };
}

export function defaultChunkConfig(): ChunkConfig {
	return {
		ownerId: null,
		info: defaultChunkInfo(),
		overwrites: {},
		presets: {},
		updatedAt: 0,
	};
}

export function defaultWorldConfig(): WorldConfig {
	return {
		version: WORLD_CONFIG_VERSION,
		ownerId: null,
		everyone: { color: "#99aab5", allow: ["view", "speak"] },
		roles: [],
		members: {},
		updatedAt: 0,
	};
}

export function emptyOverwrite(): PermissionOverwrite {
	return { allow: [], deny: [] };
}
