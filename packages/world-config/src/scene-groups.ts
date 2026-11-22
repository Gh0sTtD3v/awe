import { posToChunkKey, type XYZ } from "./chunk-key";

/**
 * Groups in saved scene data.
 *
 * A component inside a group has a `parentId`, and its `position`, `rotation`
 * (Euler XYZ, radians) and `scale` are relative to that parent, not to the
 * world. Anything that reads saved data without the engine (the studio's
 * chunk splitter, the game server's gates, zone lookups) must go through the
 * parent chain to get world values.
 */

export interface SceneComponent {
	id?: string;
	parentId?: string | null;
	position?: Partial<XYZ>;
	rotation?: Partial<XYZ>;
	scale?: Partial<XYZ>;
	[key: string]: any;
}

type Quat = { x: number; y: number; z: number; w: number };

export interface WorldTransform {
	position: XYZ;
	rotation: XYZ;
	scale: XYZ;
}

/**
 * The top-level component a component belongs to: itself, or its outermost
 * parent group. A missing parent (or a loop) ends the walk.
 */
export function topAncestor<T extends SceneComponent>(component: T, components: Record<string, T>): T {
	let current = component;
	const seen = new Set<string>();
	while (current?.parentId && components[current.parentId] && !seen.has(current.parentId)) {
		seen.add(current.parentId);
		current = components[current.parentId];
	}
	return current;
}

/**
 * The chunk a component is saved in: the chunk of its top-level group, so a
 * group and everything inside it always load together. Null when the top
 * level component has no position (it then belongs with the globals).
 */
export function chunkKeyOf(component: SceneComponent, components: Record<string, SceneComponent>): string | null {
	const top = topAncestor(component, components);
	const pos = top?.position;
	if (!pos || typeof pos.x !== "number") return null;
	return posToChunkKey(toXYZ(pos, 0));
}

/** World position, rotation and scale of a component, through its parent groups. */
export function worldTransformOf(component: SceneComponent, components: Record<string, SceneComponent>): WorldTransform {
	// Chain from the top-level ancestor down to the component.
	const chain: SceneComponent[] = [];
	let current: SceneComponent | undefined = component;
	const seen = new Set<string>();
	while (current) {
		chain.unshift(current);
		const parentId = current.parentId;
		if (!parentId || !components[parentId] || seen.has(parentId)) break;
		seen.add(parentId);
		current = components[parentId];
	}

	let pos: XYZ = { x: 0, y: 0, z: 0 };
	let quat: Quat = { x: 0, y: 0, z: 0, w: 1 };
	let scale: XYZ = { x: 1, y: 1, z: 1 };

	for (const node of chain) {
		const p = toXYZ(node.position, 0);
		const q = eulerToQuat(toXYZ(node.rotation, 0));
		const s = toXYZ(node.scale, 1);
		// world = parent ∘ local
		const scaled = { x: p.x * scale.x, y: p.y * scale.y, z: p.z * scale.z };
		const rotated = rotate(quat, scaled);
		pos = { x: pos.x + rotated.x, y: pos.y + rotated.y, z: pos.z + rotated.z };
		quat = multiply(quat, q);
		scale = { x: scale.x * s.x, y: scale.y * s.y, z: scale.z * s.z };
	}

	return { position: pos, rotation: quatToEuler(quat), scale };
}

/**
 * The same components with every grouped one's position / rotation / scale
 * replaced by its world values (top-level components are returned as is).
 * Use before reading zones, gates or portals from saved data.
 */
export function withWorldTransforms<T extends SceneComponent>(components: Record<string, T>): Record<string, T> {
	const out: Record<string, T> = {};
	for (const [id, component] of Object.entries(components)) {
		if (!component?.parentId || !components[component.parentId]) {
			out[id] = component;
			continue;
		}
		out[id] = { ...component, ...worldTransformOf(component, components) };
	}
	return out;
}

/**
 * Splits components into creation levels: first those whose parent is not in
 * the list (top-level, or parent already loaded), then their children, then
 * grandchildren… Each level can be created in parallel; a child is never
 * created before its parent. Components caught in a parent loop go last.
 */
export function parentFirstLevels<T extends SceneComponent>(entries: T[]): T[][] {
	const ids = new Set(entries.map((e) => e.id).filter(Boolean) as string[]);
	const placed = new Set<string>();
	const levels: T[][] = [];
	let remaining = entries;

	while (remaining.length) {
		const level = remaining.filter((e) => !e.parentId || !ids.has(e.parentId) || placed.has(e.parentId));
		if (!level.length) {
			levels.push(remaining);
			break;
		}
		for (const e of level) if (e.id) placed.add(e.id);
		levels.push(level);
		remaining = remaining.filter((e) => !level.includes(e));
	}
	return levels;
}

// --- small math (Euler XYZ, same convention as three.js) ---

function toXYZ(v: Partial<XYZ> | undefined, fallback: number): XYZ {
	const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : fallback);
	return { x: n(v?.x), y: n(v?.y), z: n(v?.z) };
}

function eulerToQuat(e: XYZ): Quat {
	const c1 = Math.cos(e.x / 2), c2 = Math.cos(e.y / 2), c3 = Math.cos(e.z / 2);
	const s1 = Math.sin(e.x / 2), s2 = Math.sin(e.y / 2), s3 = Math.sin(e.z / 2);
	return {
		x: s1 * c2 * c3 + c1 * s2 * s3,
		y: c1 * s2 * c3 - s1 * c2 * s3,
		z: c1 * c2 * s3 + s1 * s2 * c3,
		w: c1 * c2 * c3 - s1 * s2 * s3,
	};
}

function multiply(a: Quat, b: Quat): Quat {
	return {
		x: a.x * b.w + a.w * b.x + a.y * b.z - a.z * b.y,
		y: a.y * b.w + a.w * b.y + a.z * b.x - a.x * b.z,
		z: a.z * b.w + a.w * b.z + a.x * b.y - a.y * b.x,
		w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
	};
}

function rotate(q: Quat, v: XYZ): XYZ {
	// t = 2 * cross(q.xyz, v); v' = v + w * t + cross(q.xyz, t)
	const tx = 2 * (q.y * v.z - q.z * v.y);
	const ty = 2 * (q.z * v.x - q.x * v.z);
	const tz = 2 * (q.x * v.y - q.y * v.x);
	return {
		x: v.x + q.w * tx + (q.y * tz - q.z * ty),
		y: v.y + q.w * ty + (q.z * tx - q.x * tz),
		z: v.z + q.w * tz + (q.x * ty - q.y * tx),
	};
}

function quatToEuler(q: Quat): XYZ {
	// Rotation matrix elements needed for Euler XYZ (three.js setFromRotationMatrix).
	const m11 = 1 - 2 * (q.y * q.y + q.z * q.z);
	const m12 = 2 * (q.x * q.y - q.w * q.z);
	const m13 = 2 * (q.x * q.z + q.w * q.y);
	const m22 = 1 - 2 * (q.x * q.x + q.z * q.z);
	const m23 = 2 * (q.y * q.z - q.w * q.x);
	const m32 = 2 * (q.y * q.z + q.w * q.x);
	const m33 = 1 - 2 * (q.x * q.x + q.y * q.y);
	const y = Math.asin(Math.max(-1, Math.min(1, m13)));
	if (Math.abs(m13) < 0.9999999) {
		return { x: Math.atan2(-m23, m33), y, z: Math.atan2(-m12, m11) };
	}
	return { x: Math.atan2(m32, m22), y, z: 0 };
}
