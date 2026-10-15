/**
 * Chunk keys. The world is a uniform grid of {@link CHUNK_SIZE} cubes centred
 * on the origin, so the chunk containing the origin spans [-5000, 5000).
 *
 * A key is `"<x>_<y>_<z>"` of the integer chunk coordinates.
 */

export const CHUNK_SIZE = 10_000;

export interface XYZ {
	x: number;
	y: number;
	z: number;
}

export function posToChunkCoords(position: XYZ): XYZ {
	const h = CHUNK_SIZE / 2;
	return {
		x: Math.floor((position.x + h) / CHUNK_SIZE),
		y: Math.floor((position.y + h) / CHUNK_SIZE),
		z: Math.floor((position.z + h) / CHUNK_SIZE),
	};
}

export function chunkCoordsToKey(coords: XYZ): string {
	return `${coords.x}_${coords.y}_${coords.z}`;
}

export function posToChunkKey(position: XYZ): string {
	return chunkCoordsToKey(posToChunkCoords(position));
}

export function chunkKeyToCoords(key: string): XYZ | null {
	const parts = key.split("_");
	if (parts.length !== 3) return null;
	const [x, y, z] = parts.map(Number);
	if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
		return null;
	}
	return { x, y, z };
}
