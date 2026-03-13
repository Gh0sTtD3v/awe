import { Box3, Matrix4, Vector3, type Object3D } from "three";
import { MAXIMUM_VRM_BOX } from "../constants";

export interface VrmBBoxResult {
  vrmSize: Vector3;
  baseScaleRatio: number;
  vrmBBox: Box3;
}

export function computeVrmBBox(scene: Object3D): VrmBBoxResult {
  const box = new Box3();

  scene.traverse((child: any) => {
    if (child.geometry) {
      try {
        box.expandByObject(child);
      } catch (_e) {
        // skip invalid geometry
      }
    }
  });

  const localSize = box.getSize(new Vector3());
  const baseScaleRatio = MAXIMUM_VRM_BOX / localSize.y;

  const vrmBBox = box
    .clone()
    .applyMatrix4(
      new Matrix4().makeScale(baseScaleRatio, baseScaleRatio, baseScaleRatio),
    );
  const vrmSize = vrmBBox.getSize(new Vector3());

  return { vrmSize, baseScaleRatio, vrmBBox };
}
