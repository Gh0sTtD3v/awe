import Packer from "../../../utils/packer";
const TEXTURE_SIZE_W = 4096;
const TEXTURE_SIZE_H = 2048;

import { Skeleton, Vector3, Euler } from "three";

import loadMixamoAnimation from './load-mixamo-animation';

var tempPos = new Vector3()
var tempRot = new Euler()
var tempScale = new Vector3()

export default class AbstractBaker {
    constructor() {
        this.packer = new Packer(TEXTURE_SIZE_W, TEXTURE_SIZE_H);

        this.packer.init(TEXTURE_SIZE_W, TEXTURE_SIZE_H);
    }

    setAnimationJson(val) {
        this.jsonAnimation = val;
    }

    prepare(vrm) {
        const clips = this.prepareAnimations(vrm);

        let id = 0;

        const { mergedSkeleton, boneMap } = this.updateSkeleton(vrm.scene);
        // supress springs

        vrm.springBoneManager = null;

        vrm.update(0);

        vrm.scene.position.copy(vrm.scene.position);

        return this.bakeAll(vrm, clips, mergedSkeleton, boneMap);
    }

    updateSkeleton(scene, processedBoneMap = null) {
        let skeletons = [];

        let meshes = [];

        scene.traverse((child) => {
            if (child.type == "SkinnedMesh") {
                skeletons.push(child.skeleton);

                meshes.push(child);
            }
        });

        const { skeleton: mergedSkeleton, boneMap } =
            this.mergeSkeletons(skeletons);


        meshes.forEach((mesh) => {
            this.updateSkinIndices(
                mesh.geometry,
                mesh.skeleton,
                processedBoneMap != null ? processedBoneMap : boneMap,
            );
        });

        return { mergedSkeleton, boneMap };
    }

    prepareAnimations(vrm) {
        let needAnimation = false;

        tempPos.copy(vrm.scene.position)
        tempRot.copy(vrm.scene.rotation)
        tempScale.copy(vrm.scene.scale)

        vrm.scene.position.set(0, 0, 0)
        vrm.scene.rotation.set(0, 0, 0)
        vrm.scene.scale.set(1,1,1 )

    

        vrm.scene.traverse((child) => {
            if (child.type == "SkinnedMesh") {
                needAnimation = true;
            }
        });

        var possibleClips = [];
        

        if (needAnimation) {

            for (let b = 0; b < this.jsonAnimation.length; b++) {

                const anim = this.jsonAnimation[b];

                const clip = loadMixamoAnimation(
                    vrm.scene,
                    vrm,
                    anim.clip,
                );

                clip.name = anim.name;

                clip.loop = anim.emote.loop == true;

                clip.emote = anim.emote;

                possibleClips.push(clip);
            }            
        }

        vrm.scene.position.copy(tempPos)
        vrm.scene.rotation.copy(tempRot)
        vrm.scene.scale.copy(tempScale)

        return possibleClips;
    }

    mergeSkeletons(skeletons) {
        

        const mergedBones = []
        const boneMap = new Map()
        const mergedBoneInverses = []

        skeletons.forEach((skeleton) => {

            let i = 0
            while(i < skeleton.bones.length) {
                const bone = skeleton.bones[i]
                if (!boneMap.has(bone.name)) {
                    boneMap.set(bone.name, mergedBones.length);
                    mergedBoneInverses[ mergedBones.length] = skeleton.boneInverses[i].clone()
                    mergedBones.push(bone);
                }
                i++
            }
          
        })

        return {
            skeleton: new Skeleton(mergedBones, mergedBoneInverses),
            boneMap,
        };
    }

    updateSkinIndices(geometry, originalSkeleton, boneMap) {
        const skinIndices = geometry.attributes.skinIndex.array;

        for (let i = 0; i < skinIndices.length; i++) {


            const boneName = originalSkeleton.bones[skinIndices[i]]?.name;

            if( boneName != null ) {

                skinIndices[i] = boneMap.get(boneName);
            }
          
        }
    }
}
