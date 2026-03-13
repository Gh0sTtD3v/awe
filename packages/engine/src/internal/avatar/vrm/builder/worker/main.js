import {
    AnimationMixer,
    DataTexture,
    RGBAFormat,
    HalfFloatType,
    Vector3,
} from "three/src/Three.js";

// const delta = 1 / 60;

const MAX_TEXTURE_SIZE_W = 4096;
const MAX_TEXTURE_SIZE_H = 2048;

import DataBake from './data-texture-worker';

var id = 0;

import AbstractBaker from '../abstract-worker';

var floatView = new Float32Array(1);
var int32View = new Int32Array(floatView.buffer);

export default class BakerWorker extends AbstractBaker {
    constructor(opts = {}) {
        super();

        this.FPS_BAKING = opts.fps;

        this.deltaFPS = 1 / this.FPS_BAKING;
    }

    // bakeAll( currentVrm, model, clips, skin) {
    bakeAll(currentVrm, clips, skeleton, boneMap) {
        // this.skin.skeleton.computeBoneTexture()

        const extras = {};

        this.frameCount = -1;

        this.boneCount = skeleton.bones.length;

        this.maxBoneElements = this.boneCount * 4 * 4;

        const mixer = new AnimationMixer(currentVrm.scene);

        const ids = [];

        var res = [];

        const loops = [];

        const timeScales = [];

        let i = 0;

        // currentVrm.scene.updateWorldMatrix(true, true)

        while (i < clips.length) {
            const c = this.getBakedClip2(
                currentVrm,
                mixer,
                skeleton,
                clips[i],
                extras
            );

            if (c.w > MAX_TEXTURE_SIZE_W || c.h > MAX_TEXTURE_SIZE_H) {
                i++;
                console.error("Texture size is too large ", c.url, c.w, c.h);
                continue;
            }

            res.push(c);

            ids.push(clips[i].name);

            loops.push(clips[i].emote.loop == true ? 1 : 0);

            timeScales.push(
                clips[i].emote.timeScale != null ? clips[i].emote.timeScale : 1
            );

            i++;
        }
        // console.log( res )
        // console.log( res.length )

        // if( FBO_DEBUG ) {

        // 	FBOHelper.attach ( this.skin.skeleton.boneTexture , 'bones' + id)
        // }

        // metadata size for uvs / scale etc..

        const metadataSize = res.length;

        const metadataArray = new Float32Array(metadataSize * 4);

        var metaDataBlock = {
            w: metadataSize,
            h: 1,
            url: "metadata",
            image: new DataTexture(
                metadataArray,
                metadataSize,
                1,
                RGBAFormat,
                HalfFloatType
            ),
        };

        res.push(metaDataBlock);

        // additional metadata for loops etc..

        const metaDataAdditionals = new Float32Array(metadataSize * 4);

        const metaDataAdditionalsArray = new Float32Array(metadataSize * 4);

        var metaDataAdditionalsBlock = {
            w: metadataSize,
            h: 1,
            url: "metadataadditionals",
            image: new DataTexture(
                metaDataAdditionalsArray,
                metadataSize,
                1,
                RGBAFormat,
                HalfFloatType
            ),
        };

        res.push(metaDataAdditionalsBlock);

        this.packer.reset();

        this.packer.fit(res);

        this.bakeTexture = new DataBake(
            this.packer.maxSize.w,
            this.packer.maxSize.h
        );

        i = 0;

        // const metaDataArray = []

        while (i < res.length) {
            if (res.url != "metadata" && res.url != "metadataadditionals") {
                this.bakeTexture.update(
                    res[i].image,
                    res[i].fit.x,
                    res[i].fit.y
                );

                res[i].uvScale = {
                    x: res[i].w / this.packer.maxSize.w,
                    y: res[i].h / this.packer.maxSize.h,
                };

                res[i].uvPos = {
                    x: res[i].fit.x / this.packer.maxSize.w,
                    y: res[i].fit.y / this.packer.maxSize.h,
                };

                const dat = metaDataBlock.image.source.data.data;

                dat[i * 4] = res[i].uvPos.x;
                dat[i * 4 + 1] = res[i].uvPos.y;
                dat[i * 4 + 2] = res[i].uvScale.x;
                dat[i * 4 + 3] = res[i].uvScale.y;

                const additionalMeta =
                    metaDataAdditionalsBlock.image.source.data.data;

                additionalMeta[i * 4] = loops[i];
                additionalMeta[i * 4 + 1] = timeScales[i];
            }

            i++;
        }

        // clean

        // update metadata in texture

        this.bakeTexture.update(
            metaDataBlock.image,
            metaDataBlock.fit.x,
            metaDataBlock.fit.y
        );

        this.bakeTexture.needsUpdate = true;

        id++;

        let c = 0;

        while (c < res.length) {
            res[c].image.dispose();
            res[c].data = null;

            res[c] = null;
            c++;
        }

        // skeleton.pose()

        // skeleton.update()

        return {
            boneMap: boneMap,
            texture: this.bakeTexture,
            metadata: metaDataBlock,
            ids: ids,
            metaDataArray: metadataArray,
            additionalMeta: metaDataAdditionalsBlock,
            extras: extras,
        };
    }

    getBakedClip2(currentVrm, mixer, skeleton, clip, extras) {
        this.delta = 0;

        const duration = clip.duration;

        const frameCount = Math.floor(duration / this.deltaFPS);

        const action = mixer.clipAction(clip).play();

        const textureSize = this.boneCount * 4 * 4 * frameCount;

        const vertexData = new Uint16Array(textureSize);

        var d = 0;

        var currentFrame = 0;

        const IS_SITTING = clip.name == "SITTING";

        const _hipstemp = new Vector3();

        const _spinetemp = new Vector3();

        while (currentFrame < frameCount) {
            mixer.update(this.deltaFPS);

            currentVrm.update(this.deltaFPS);

            d += this.deltaFPS;

            let i = 0;

            let hasBoneFirstChild = false;

            while (i < currentVrm.scene.children.length) {
                if (currentVrm.scene.children[i].isBone) {
                    hasBoneFirstChild = true;

                    currentVrm.scene.children[i].updateWorldMatrix(false, true);
                }

                i++;
            }

            // needs to update everything..
            if (hasBoneFirstChild == false) {
                currentVrm.scene.updateWorldMatrix(false, true);
            }

            skeleton.update();

            i = 0;

            while (i < this.maxBoneElements) {
                const index = this.maxBoneElements * currentFrame + i;

                vertexData[index] = this.toHalf(skeleton.boneMatrices[i]);

                i++;
            }

            if (IS_SITTING && currentFrame == 0) {
                currentVrm.humanoid
                    ?.getNormalizedBoneNode("hips")
                    .getWorldPosition(_hipstemp);

                currentVrm.humanoid
                    ?.getNormalizedBoneNode("spine")
                    .getWorldPosition(_spinetemp);
            }

            currentFrame++;
        }

        action.stop();

        const width = this.boneCount * 4;

        // console.log( clip.name )

        let res = {
            data: vertexData,

            image: new DataTexture(
                vertexData,
                width,
                frameCount,
                RGBAFormat,
                HalfFloatType
            ),

            url: clip.name,

            w: width,

            h: frameCount,

            frames: frameCount,

            duration: duration,
        };

        if (IS_SITTING) {
            extras[clip.name] = {
                spinePosition: {
                    x: _spinetemp.x,
                    y: _spinetemp.y,
                    z: _spinetemp.z,
                },
                hipsPosition: {
                    x: _hipstemp.x,
                    y: _hipstemp.y,
                    z: _hipstemp.z,
                },
            };
        }

        return res;
    }

    toHalf(val) {
        floatView[0] = val;
        var x = int32View[0];

        var bits = (x >> 16) & 0x8000; /* Get the sign */
        var m = (x >> 12) & 0x07ff; /* Keep one extra bit for rounding */
        var e = (x >> 23) & 0xff; /* Using int is faster here */

        /* If zero, or denormal, or exponent underflows too much for a denormal
         * half, return signed zero. */
        if (e < 103) return bits;

        /* If NaN, return NaN. If Inf or exponent overflow, return Inf. */
        if (e > 142) {
            bits |= 0x7c00;
            /* If exponent was 0xff and one mantissa bit was set, it means NaN,
             * not Inf, so make sure we set one mantissa bit too. */
            bits |= (e == 255 ? 0 : 1) && x & 0x007fffff;
            return bits;
        }

        /* If exponent underflows but not too much, return a denormal */
        if (e < 113) {
            m |= 0x0800;
            /* Extra rounding may overflow and set mantissa to 0 and exponent
             * to 1, which is OK. */
            bits |= (m >> (114 - e)) + ((m >> (113 - e)) & 1);
            return bits;
        }

        bits |= ((e - 112) << 10) | (m >> 1);
        /* Extra rounding. An overflow will set mantissa to 0 and increment
         * the exponent, which is OK. */
        bits += m & 1;
        return bits;
    }
}
