// @ts-check

import RainGeometry from './geometry';

import RainMaterial from './material';

import PipeLineMesh from "../pipeline/pipeline-mesh";

export default class RainMesh extends PipeLineMesh {
    constructor(opts) {
        let geometry = new RainGeometry();

        let material = new RainMaterial(opts);

        super(geometry, material, {
            // visibleOnOcclusion : false,

            visibleOnMirror: false,
        });

        this.frustumCulled = false;
    }


    get intensity() {
        return this.material.uniforms.intensity.value;
    }

    set intensity(v) {
        this.material.uniforms.intensity.value = v;
    }
}
