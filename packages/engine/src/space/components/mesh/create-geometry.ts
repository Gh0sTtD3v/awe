import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  PlaneGeometry,
  SphereGeometry,
} from "three";
import { COLLIDER_TYPES } from "../../../physics/types";
import type { MeshGeometryData } from "./mesh-data";

/**
 * @internal
 *
 * Creates a Three.js BufferGeometry from mesh geometry data.
 * Shared between web and headless mesh components.
 */
export function createMeshGeometry(geodata: MeshGeometryData): BufferGeometry {
  switch (geodata.type) {
    case "plane": {
      const { width, height } = geodata.boxParams ?? {};
      return new PlaneGeometry(width || 1, height || 1);
    }
    case "box": {
      const { width, height, depth } = geodata.boxParams ?? {};
      return new BoxGeometry(width || 1, height || 1, depth || 1);
    }
    case "sphere": {
      const { radius, widthSegments, heightSegments } = geodata.sphereParams;
      return new SphereGeometry(radius, widthSegments, heightSegments);
    }
    case "cylinder": {
      const {
        radiusTop,
        radiusBottom,
        height,
        radialSegments,
        heightSegments,
        openEnded,
      } = geodata.cylinderParams;
      return new CylinderGeometry(
        radiusTop,
        radiusBottom,
        height,
        radialSegments,
        heightSegments,
        openEnded,
      );
    }
    case "dome": {
      const { radius, widthSegments, heightSegments } = geodata.sphereParams;
      return new SphereGeometry(
        radius,
        widthSegments,
        heightSegments,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.5,
      );
    }
    default:
      console.error(`Unknown geometry type: ${(geodata as any).type}`);
      return new BoxGeometry();
  }
}

/**
 * @internal
 *
 * Determines the physics collider type for a mesh geometry.
 * Shared between web and headless mesh components.
 */
export function getMeshColliderType(
  geodata: MeshGeometryData,
  geometry: BufferGeometry,
): string | undefined {
  if (geodata.type === "sphere") {
    return COLLIDER_TYPES.SPHERE;
  } else if (geometry.type === "BoxGeometry") {
    return COLLIDER_TYPES.CUBE;
  } else if (geometry.type === "CylinderGeometry") {
    const params = (geometry as CylinderGeometry).parameters;
    if (params.radiusTop === params.radiusBottom) {
      return COLLIDER_TYPES.CYLINDER;
    }
  }
  return undefined;
}
