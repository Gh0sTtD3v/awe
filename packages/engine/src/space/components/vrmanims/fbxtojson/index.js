// @ts-check

import { FBXLoader } from "./lib/fbx-loader";

import { loadMixamoAnimation } from "./lib/mixamo";

const loader = new FBXLoader();

export function fbxToJSON(buffer) {
    //
    const fbx = loader.parse(buffer);

    const bake = loadMixamoAnimation(fbx);

    return bake;
}
