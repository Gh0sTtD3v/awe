import { GLTFLoader } from './baker-gltf-worker-loader';

import { VRMLoaderPlugin } from './three-vrm-module';

import Baker from './main';

let gltfLoader = new GLTFLoader().setCrossOrigin("anonymous");

gltfLoader.register((parser) => {
    const p = new VRMLoaderPlugin(parser, {
        helperRoot: null && helperRoot,
        autoUpdateHumanBones: true,
    });

    p.metaPlugin.needThumbnailImage = false;

    p.mtoonMaterialPlugin.getMaterialType = (materialIndex) => {
        return null;
    };

    return p;
});

let baker;

self.addEventListener(
    "message",

    async function (e) {
        if (e.data.init == true) {
            baker = new Baker(e.data);

            baker.setAnimationJson(e.data.animation);

            return;
        }

        if (e.data.animation) {
            baker.setAnimationJson(e.data.animation);
        }

        try {
            const url = e.data.url;

            let gltf;

            if (e.data.rawBuffer) {
                gltf = await gltfLoader.parseAsync(e.data.rawBuffer, "");
            } else {
                gltf = await gltfLoader.loadAsync(url);
            }

            const globalmeta = baker.prepare(gltf.userData.vrm);

            self.postMessage(
                {
                    done: true,
                    data: globalmeta,
                    rawBuffer: e.data.rawBuffer,
                },
                [globalmeta.texture.source.data.data.buffer, e.data.rawBuffer]
            );
        } catch (error) {
            console.error(error);

            self.postMessage({
                error: true,
            });
        } finally {
        }
    },

    false
);
