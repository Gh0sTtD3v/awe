import { Box3, Matrix4, Sphere, Vector3 } from "three";

/**
 * Bounding sphere of a skinned mesh that follows its current pose.
 *
 * three.js culls and depth-sorts a SkinnedMesh with `boundingSphere`, which it
 * computes once (in whatever pose the mesh is in at that moment, usually the
 * rest pose) and never updates. Animated layers whose parts travel far from
 * their rest spot (people walking, objects flying past a window, one mesh per
 * material) were then culled while in plain view, or sorted against glass
 * and pictures as if they were still at their rest spot.
 *
 * Here each bone gets, once, the sphere around the vertices it moves (in the
 * bone's own space, from the bind pose). Each frame the mesh's sphere is the
 * one enclosing those bone spheres, moved by the bones' current matrices:
 * a few dozen sphere transforms instead of every vertex. A vertex shared by
 * several bones lies between its per-bone positions, so the enclosing sphere
 * still contains it.
 */

const _m = new Matrix4();
const _bindInverse = new Matrix4();
const _v = new Vector3();
const _c = new Vector3();
const _box = new Box3();
const _corner = new Vector3();

/** Per-bone spheres in bone space, or null if the mesh can't be measured. */
export function measureBoneSpheres(mesh) {
    const geometry = mesh.geometry;
    const skeleton = mesh.skeleton;
    const position = geometry?.attributes?.position;
    const skinIndex = geometry?.attributes?.skinIndex;
    const skinWeight = geometry?.attributes?.skinWeight;

    if (!skeleton || !position || !skinIndex || !skinWeight) return null;

    const bones = skeleton.bones;
    const inverses = skeleton.boneInverses;
    const boxes = bones.map(() => new Box3());

    for (let i = 0; i < position.count; i++) {
        for (let k = 0; k < 4; k++) {
            if (skinWeight.getComponent(i, k) <= 0) continue;

            const b = skinIndex.getComponent(i, k);

            if (!inverses[b]) continue;

            // Vertex in the bone's space: boneInverse * bindMatrix * v
            _v.fromBufferAttribute(position, i)
                .applyMatrix4(mesh.bindMatrix)
                .applyMatrix4(inverses[b]);

            boxes[b].expandByPoint(_v);
        }
    }

    const spheres = [];

    boxes.forEach((box, b) => {
        if (box.isEmpty()) return;

        const sphere = box.getBoundingSphere(new Sphere());

        spheres.push({ bone: bones[b], center: sphere.center, radius: sphere.radius });
    });

    return spheres.length ? spheres : null;
}

/**
 * Write into `target` (mesh space) the sphere enclosing the bone spheres in
 * their current pose. Returns false if there is nothing to measure.
 */
export function poseBoundingSphere(mesh, boneSpheres, target) {
    if (!boneSpheres || boneSpheres.length === 0) return false;

    // Mesh space = bindMatrixInverse * bone.matrixWorld * (bone space)
    _bindInverse.copy(mesh.bindMatrixInverse);

    _box.makeEmpty();

    for (const { bone, center, radius } of boneSpheres) {
        _m.multiplyMatrices(_bindInverse, bone.matrixWorld);

        _c.copy(center).applyMatrix4(_m);

        const r = radius * _m.getMaxScaleOnAxis();

        _box.expandByPoint(_corner.set(_c.x - r, _c.y - r, _c.z - r));
        _box.expandByPoint(_corner.set(_c.x + r, _c.y + r, _c.z + r));
    }

    _box.getBoundingSphere(target);

    return true;
}
