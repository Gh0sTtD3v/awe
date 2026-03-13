import { Matrix4, Mesh, MeshBasicMaterial, Object3D } from "three";
import { mergeBufferGeometries } from "../../utils/geometry";

/**
 * @internal
 *
 * Build a collision mesh by traversing all meshes in a scene,
 * cloning their geometries with world transforms applied, and merging them.
 */
export function buildCollisionMeshFromScene(
  scene: Object3D,
  parent?: Object3D,
): Mesh | null {
  const matParentInv = new Matrix4();

  if (parent) {
    matParentInv.copy(parent.matrixWorld).invert();
  }

  const geometries: any[] = [];

  scene.updateMatrixWorld(true);

  scene.traverse((child: any) => {
    if (child.isMesh) {
      child.updateMatrixWorld();

      const geom = child.geometry.clone();
      geom.applyMatrix4(child.matrixWorld);
      geom.applyMatrix4(matParentInv);
      geometries.push(geom);
    }
  });

  if (geometries.length === 0) {
    return null;
  }

  const mergedGeometry = mergeBufferGeometries(geometries, false, {
    forceList: ["position"],
    ignoreMorphTargets: true,
  });

  return new Mesh(
    mergedGeometry,
    new MeshBasicMaterial({ color: 0xff00ff, wireframe: true }),
  );
}
