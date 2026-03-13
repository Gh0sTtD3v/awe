import helper from "../fbo-helper";


import emitter from "../../engine-emitter";
import { EngineEvents } from "../../engine-events";

import { FBO_DEBUG } from "../../constants";

import Renderer from "../../renderer";


var FBOHelper = null;

if (FBO_DEBUG) {
    var FBOHelper = new helper(Renderer);

    FBOHelper.setSize(window.innerWidth, window.innerHeight);

    emitter.on(EngineEvents.RESIZE, (w, h) => {
        FBOHelper.setSize(w, h);
    });

    emitter.on(EngineEvents.POST_RENDER, () => {
        let older = Renderer.getRenderTarget();

        FBOHelper.update();

        Renderer.setRenderTarget(older);
    });
} else {
    FBOHelper = {
        attach: () => {},
    };
}

export default FBOHelper;
