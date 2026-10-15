/**
 * The single source of truth for how a component is distributed across the
 * static scene file and the per-chunk files.
 *
 * Two orthogonal concepts, easily confused:
 *
 * - `singleton` (declared per-component as `info.singleton` in the engine
 *   registry) means "only one of these may exist in a space".
 * - A *preset type* is an environment singleton whose values may be overridden
 *   per chunk. Every preset type is a singleton, but not every singleton is a
 *   preset type — `destination` is a singleton that carries a position, so it
 *   belongs to a chunk rather than configuring one.
 */

/** Always in the static file, never chunk-loaded or unloaded. */
export const GLOBAL_TYPES: ReadonlySet<string> = new Set([
	"avatar",
	"vrm-anims",
]);

/**
 * Environment singletons. Defaults live in the static file; each chunk may
 * override individual fields. Never created or destroyed on chunk transition —
 * only re-configured via `setData`.
 */
export const PRESET_TYPES: ReadonlySet<string> = new Set([
	"water",
	"reflector",
	"background",
	"envmap",
	"lighting",
	"fog",
	"postprocessing",
	"rain",
]);

export function isGlobalType(type: string): boolean {
	return GLOBAL_TYPES.has(type);
}

export function isPresetType(type: string): boolean {
	return PRESET_TYPES.has(type);
}

/** A component with no usable position can't belong to a chunk. */
export function hasChunkPosition(comp: any): boolean {
	return typeof comp?.position?.x === "number";
}

/**
 * Whether a component belongs in the static/global file rather than a chunk
 * file. Globals and presets stay in static; so does anything unpositioned.
 */
export function isGlobalComponent(comp: any): boolean {
	if (!comp) return true;
	if (isGlobalType(comp.type)) return true;
	if (isPresetType(comp.type)) return true;
	return !hasChunkPosition(comp);
}

/** Filter a component map down to globals + presets (the initial load set). */
export function filterGlobalComponents(
	components: Record<string, any>,
): Record<string, any> {
	const globals: Record<string, any> = {};
	for (const [id, comp] of Object.entries(components ?? {})) {
		if (isGlobalComponent(comp)) globals[id] = comp;
	}
	return globals;
}
