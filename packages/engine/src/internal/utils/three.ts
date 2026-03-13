import { Component3D } from "../../space/abstract/component-3d";
import {
    Box3,
    Camera,
    Euler,
    EulerOrder,
    MathUtils,
    Matrix4,
    Mesh,
    Object3D,
    PerspectiveCamera,
    Vector3,
} from "three";

export const UP_VECTOR = new Vector3(0, 1, 0);
export const DOWN_VECTOR = new Vector3(0, -1, 0);
export const LEFT_VECTOR = new Vector3(-1, 0, 0);
export const RIGHT_VECTOR = new Vector3(1, 0, 0);

const tmpVec3 = new Vector3();

/**
 * Translates the object on the axis perpendicular to the camera-to-object vector on the XZ plane
 */
export function offsetHorz(
    object: Object3D,
    camera: Camera,
    offset: number,
    target: Vector3 = new Vector3()
) {
    tmpVec3.subVectors(object.position, camera.position).normalize();

    // Calculate the lateral offset vector (perpendicular on the XZ plane)
    // if offset is to the right otherwise to the left
    tmpVec3.cross(camera.up);

    // Apply the offset
    target.addScaledVector(tmpVec3, offset);

    return target;
}

const tmpDir = new Vector3();

export function getYRotation(source: Vector3, target: Vector3, offset = 0) {
    //
    const direction = tmpDir.subVectors(target, source).normalize();

    let angle = Math.atan2(direction.x, direction.z) + offset;

    return angle;
}

const bbSize = new Vector3();
const meshScale = new Vector3();

export function lookAtDistance(target: Mesh | Box3, camera: PerspectiveCamera) {
    //
    if (target instanceof Mesh) {
        const geo = target.geometry;
        if (geo.boundingBox == null) {
            geo.computeBoundingBox();
        }
        geo.boundingBox.getSize(bbSize);
        target.getWorldScale(meshScale);
    } else {
        bbSize.copy(target.getSize(bbSize));
        meshScale.set(1, 1, 1);
    }

    const radius =
        Math.max(
            bbSize.x * meshScale.x,
            bbSize.y * meshScale.y,
            bbSize.z * meshScale.z
        ) / 2;

    return getDistanceToFitSphere(camera, radius);
}

export function getDistanceToFitSphere(camera, radius) {
    //
    const vFOV = camera.getEffectiveFOV() * MathUtils.DEG2RAD;

    const hFOV = Math.atan(Math.tan(vFOV * 0.5) * camera.aspect) * 2;

    const fov = 1 < camera.aspect ? vFOV : hFOV;

    return radius / Math.sin(fov * 0.5);
}

export function getBestLookAtPosition(
    target: Component3D,
    camera: PerspectiveCamera,
    opts: { offset?: number } = {}
) {
    //
    target.updateWorldMatrix(true, true);

    const bbox = target.getBBox();

    const targetPos = target.getWorldPosition(new Vector3());

    let lookatTarget = target.getCollisionMesh() || bbox;

    const dist =
        opts.offset ??
        Math.min(Math.max(lookAtDistance(lookatTarget, camera), 4), 10);

    console.log("maxLookAtDistance", dist);

    let position: Vector3;

    const dir = target.getWorldDirection(new Vector3());

    position = targetPos.clone().add(dir.multiplyScalar(dist));

    return position;
}

let memo = new WeakMap<Matrix4, { prev: Matrix4; inv: Matrix4 }>();

export function getInvMatrixMemo(mat: Matrix4) {
    //
    if (!memo.has(mat)) {
        memo.set(mat, { prev: mat.clone(), inv: mat.clone().invert() });
    }

    let m = memo.get(mat);

    if (!m.prev.equals(mat)) {
        m.prev.copy(mat);
        m.inv.copy(mat).invert();
    }

    return m.inv;
}

/**
 * convert
 */
export function reorderRotation(
    rotation: { x: number; y: number; z: number },
    prevOrder: EulerOrder,
    newOrder: EulerOrder
) {
    //
    const euler = new Euler(rotation.x, rotation.y, rotation.z, prevOrder);

    euler.reorder(newOrder);

    return {
        x: euler.x,
        y: euler.y,
        z: euler.z,
    };
}
