
import emitter from "../../engine-emitter";
import { EngineEvents } from "../../engine-events";

import { Vector2, Vector3, Color } from "three";

import {
    DEBUG,
    DPI,

    //RECORD_SIZE
} from "../../constants";

const BASE_TIME_ANIMATION = Math.floor(1666697916565 / 1000) % 500;

class Shared {

    
    constructor() {
        this.timer = {
            value: 0,
        };

        this.timer_d2 = {
            value: 0,
        };

        this.timer_x2 = {

            value: 0
        }

        this.scanTimer = {
            value: 0,
        };

        this.aspect = {
            value: 0,
        };

        this.invaspect = {
            value: 0,
        };

        this.animationTimer = {
            value: BASE_TIME_ANIMATION,
        };

        this.dpi = {
            value: 1,
        };

        this.resolution = {
            value: new Vector2(1, 1),
        };

        this.invresolution = {
            value: new Vector2(1, 1),
        };

        this.record_size = {
            value: new Vector2(1, 1),
        };

        this.fog = {
            value: new Vector2(0, 49),
        };

        this.fogFadeColor = {
            value: new Color(0x054d73),
        };

        this.fogTexture = {
            value: null,
        };

        this.fogTextureEnabled = {
            value: 0,
        };

        this.fogTextureCubeUVSize = {
            value: new Vector3(0, 0, 0),
        };

        this.isDynamicRendering = {
            value: 0,
        };

        this.isScreenShotRendering = {
            value: 0,
        };

        // Shadow-only light index for dual-shadow system
        // Real-time light is always at index 1 (second directional light)
        this.shadowOnlyLightIndex = {
            value: 1,
        };

        if (DEBUG) {
            globalThis.shared = this;
        }

        this.addEvents();
    }

    update(delta) {
        // console.log( Date.now() / 1000  - BASE_TIME_ANIMATION )

        this.animationTimer.value += delta;

        this.timer.value += delta;

        this.timer_d2.value += delta * 0.5;

        this.timer_x2.value += delta * 2;

        this.scanTimer.value += delta;

        this.dpi.value = DPI;

        //this.record_size.value.set( RECORD_SIZE.w , RECORD_SIZE.h )
    }

    resize(w, h) {
        this.aspect.value = w / h;

        this.invaspect.value = 1 / (w / h);

        this.resolution.value.set(w, h);

        this.invresolution.value.set(1 / w, 1 / h);
    }

    addEvents() {
        emitter.on(EngineEvents.PRE_RENDER, this.update.bind(this));

        emitter.on(EngineEvents.RESIZE, this.resize.bind(this));
    }
}

export default new Shared();
