import {
    QuaternionKeyframeTrack,
    AnimationClip,
    Quaternion,
    Vector3,
    VectorKeyframeTrack
} from "three/src/Three.js";

import {
    ObjectLoader
} from './loader-object-worker';

import mixamoVRMRigMap from '../data/rigmap';

import MixamoRigJSON from "../data/baserig.json";

const objLoader = new ObjectLoader();

const MIXAMO_SKELETON = objLoader.parse(MixamoRigJSON);

/**
 * Load Mixamo animation, convert for three-vrm use, and return it.
 *
 * @param {string} url A url of mixamo animation data
 * @param {VRM} vrm A target VRM
 * @returns {Promise<THREE.AnimationClip>} The converted AnimationClip
 */

var loadMixamoAnimation = function (asset, vrm, anim, high = false) {
    const clip = AnimationClip.parse(anim); // extract the AnimationClip

    const tracks = []; // KeyframeTracks compatible with VRM will be added here

    const restRotationInverse = new Quaternion();
    const parentRestWorldRotation = new Quaternion();
    const _quatA = new Quaternion();
    const _vec3 = new Vector3();

    // Adjust with reference to hips height.
    const motionHipsHeight =
        MIXAMO_SKELETON.getObjectByName("mixamorigHips").getWorldPosition(
            _vec3,
        ).y;
    const vrmHipsY = vrm.humanoid
        ?.getNormalizedBoneNode("hips")
        .getWorldPosition(_vec3).y;
    const vrmRootY = vrm.scene.getWorldPosition(_vec3).y;
    const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY);
    const hipsPositionScale = vrmHipsHeight / motionHipsHeight;

    clip.tracks.forEach((track) => {
        // Convert each tracks for VRM use, and push to `tracks`
        const trackSplitted = track.name.split(".");
        const mixamoRigName = trackSplitted[0];
        const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
        const vrmNodeName =
            vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;
        // const mixamoRigNode = asset.getObjectByName( mixamoRigName );

        // console.log( mixamoRigName)
        // console.log( vrmBoneName)

        if (vrmNodeName != null) {
            const propertyName = trackSplitted[1];

            // Store rotations of rest-pose.
            // mixamoRigNode.getWorldQuaternion( restRotationInverse ).invert();
            // mixamoRigNode.parent.getWorldQuaternion( parentRestWorldRotation );

            if (track instanceof QuaternionKeyframeTrack) {
                if (high) {
                    // Retarget rotation of mixamoRig to NormalizedBone.
                    for (let i = 0; i < track.values.length; i += 4) {
                        const flatQuaternion = track.values.slice(i, i + 4);

                        _quatA.fromArray(flatQuaternion);

                        // 親のレスト時ワールド回転 * トラックの回転 * レスト時ワールド回転の逆
                        _quatA
                            .premultiply(parentRestWorldRotation)
                            .multiply(restRotationInverse);

                        _quatA.toArray(flatQuaternion);

                        flatQuaternion.forEach((v, index) => {
                            track.values[index + i] = v;
                        });
                    }
                }

                tracks.push(
                    new QuaternionKeyframeTrack(
                        `${vrmNodeName}.${propertyName}`,
                        track.times,
                        track.values.map((v, i) =>
                            vrm.meta?.metaVersion === "0" && i % 2 === 0
                                ? -v
                                : v,
                        ),
                    ),
                );
            } else if (track instanceof VectorKeyframeTrack) {
                const value = track.values.map(
                    (v, i) =>
                        (vrm.meta?.metaVersion === "0" && i % 3 !== 1
                            ? -v
                            : v) * hipsPositionScale,
                );
                tracks.push(
                    new VectorKeyframeTrack(
                        `${vrmNodeName}.${propertyName}`,
                        track.times,
                        value,
                    ),
                );
            }
        }
    });

    return new AnimationClip("vrmAnimation", clip.duration, tracks);
};

export default loadMixamoAnimation;
