import { Box3, Vector3 } from "three";

/**
 * Restricts vertices to those within specified bounds
 * @param positions - Flat array of vertex positions (x, y, z coordinates)
 * @param indices - Array of triangle indices
 * @param bounds - Three.js Box3 defining the boundary
 * @returns Object containing filtered positions and indices
 */
export function restrictToBounds(
    positions: Float32Array,
    indices: Uint32Array,
    bounds: Box3
): [positions: Float32Array, indices: Uint32Array] {
    // Create a new vertex map to track which vertices are within bounds
    const vertexInBounds = new Array(positions.length / 3).fill(false);

    // First, mark vertices that are within bounds
    for (let i = 0; i < positions.length; i += 3) {
        const vertex = new Vector3(
            positions[i],
            positions[i + 1],
            positions[i + 2]
        );

        vertexInBounds[i / 3] = bounds.containsPoint(vertex);
    }

    // Create mapping of old vertex indices to new vertex indices
    const vertexRemap = new Array(positions.length / 3).fill(-1);
    let newVertexCount = 0;

    // First pass: count valid vertices and create remap
    for (let i = 0; i < vertexInBounds.length; i++) {
        if (vertexInBounds[i]) {
            vertexRemap[i] = newVertexCount++;
        }
    }

    // Allocate new arrays for filtered data
    const newPositions = new Float32Array(newVertexCount * 3);
    const newIndices: number[] = [];

    // Copy valid vertices to new positions array
    for (let i = 0; i < vertexInBounds.length; i++) {
        if (vertexInBounds[i]) {
            const newIndex = vertexRemap[i];
            newPositions[newIndex * 3] = positions[i * 3];
            newPositions[newIndex * 3 + 1] = positions[i * 3 + 1];
            newPositions[newIndex * 3 + 2] = positions[i * 3 + 2];
        }
    }

    // Filter indices, only keeping triangles where all vertices are in bounds
    for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i];
        const b = indices[i + 1];
        const c = indices[i + 2];

        // Only add triangle if all vertices are within bounds
        if (vertexInBounds[a] && vertexInBounds[b] && vertexInBounds[c]) {
            newIndices.push(vertexRemap[a], vertexRemap[b], vertexRemap[c]);
        }
    }

    return [newPositions, new Uint32Array(newIndices)];
}
