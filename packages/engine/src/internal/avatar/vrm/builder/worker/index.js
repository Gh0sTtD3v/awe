import WorkerPool from "../../../../utils/worker-pool";

// import animationJson from "../../data/animations.json";
import VRMAnimation from "../../animations";

import { IS_MOBILE, FPS_BAKING } from "../../../../constants";

import { DataTexture, RGBAFormat, HalfFloatType } from "three";

class BakerWorker {
    constructor() {}

    prepare(url, gltf  ) {
        if (this.wPool == null) {
            const animation = VRMAnimation.animations;

            const createBakerWorker = () => new Worker(new URL('./baker.worker.js', import.meta.url));
            this.wPool = new WorkerPool(
                createBakerWorker,
                IS_MOBILE ? 4 : 8,
                false,
                {
                    animation,
                    fps: FPS_BAKING,
                }
            );
        }

        // url, msg, cb, ctx, abort, transferrable
        return new Promise((resolve, reject) => {
            this.wPool.queueJob(

                // url 
                "./baker.worker.js",

                // msg
                {
                    url: url,
                    rawBuffer: gltf.rawBuffer,
                    animation: VRMAnimation.animations,
                },

                // cb
                (e) => {
                    if (e.data.error == true) {
                        reject("not found " + url);
                    }

                    const res = e.data.data;

                    // restore raw buffer after being passed to the worker
                    gltf.rawBuffer = e.data.rawBuffer;

                    res.texture = new DataTexture(
                        res.texture.source.data.data,
                        res.texture.source.data.width,
                        res.texture.source.data.height,
                        RGBAFormat,
                        HalfFloatType
                    );

                    res.texture.needsUpdate = true;

                    resolve(res);
                },

                // ctx
                this,

                // abort
                null,

                // transferrable

                [ gltf.rawBuffer ]

            );
        });
    }
}

export default new BakerWorker();
