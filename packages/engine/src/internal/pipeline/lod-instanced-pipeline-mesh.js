import InstancedPipelineMesh from './instanced-pipeline-mesh';
import InstancedGeometry from './instanced-geometry';
import LODInstancedGroup from './lod-instanced-group';

/**
 * Factory function to create instanced mesh with LOD support.
 *
 * For non-LOD geometries: returns a single InstancedPipelineMesh (unchanged behavior)
 * For LOD geometries: returns a LODInstancedGroup containing InstancedPipelineMesh per LOD level
 *
 * @param {BufferGeometry} geometry - The base geometry (may have .lod array)
 * @param {Material} material - The material to use
 * @param {Object} geoOpts - Options for InstancedGeometry
 * @param {Object} meshOpts - Options for InstancedPipelineMesh
 * @returns {InstancedPipelineMesh|LODInstancedGroup}
 */
export function createInstancedMesh(geometry, material, geoOpts = {}, meshOpts = {}) {
    const baseGeo = new InstancedGeometry(geometry, geoOpts);

    if (!baseGeo.isLOD) {
        return new InstancedPipelineMesh(baseGeo, material, meshOpts);
    }

    // Create mesh per LOD level
    const lodGeometries = baseGeo.getLODGeometries();
    const lodMeshes = lodGeometries.map((geo, i) => {
        const mesh = new InstancedPipelineMesh(geo, material, {
            ...meshOpts,
            _isLODChild: true, // Flag to skip individual event handling
        });
        mesh.frustumCulled = false;
        mesh._lodIndex = i;
        mesh._isLODChild = true;
        return mesh;
    });

    return new LODInstancedGroup(lodMeshes, baseGeo, meshOpts);
}

/**
 * Convenience function that matches the existing InstancedMeshFactory pattern.
 * Creates the geometry and mesh in one call.
 */
export function createInstancedPipelineMesh(baseGeometry, material, instancedGeometryOptions, pipelineOptions) {
    return createInstancedMesh(baseGeometry, material, instancedGeometryOptions, pipelineOptions);
}

export default createInstancedMesh;
