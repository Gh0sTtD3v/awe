// @ts-check

import { Color } from "three";
import WaveGeometry from './geometry';

import WaveMaterial from './material';

import PipeLineMesh from "../pipeline/pipeline-mesh";

export default class WaveMesh extends PipeLineMesh {

    constructor(opts) {
        //
        let geometry = new WaveGeometry(opts);

        let material = new WaveMaterial(opts);

        super(geometry, material, {
            // visibleOnOcclusion : false,

            visibleOnMirror: false,
        });

        this.frustumCulled = false;
    }

    get radius() {
        return this.material.uniforms.radius.value;
    }

    set radius(val) {
        this.material.uniforms.radius.value = val;
    }

    get lineWidth() {
        return this.material.uniforms.linewidth.value;
    }

    set lineWidth(val) {
        this.material.uniforms.linewidth.value = val;
    }

    get color() {

        return this.material.uniforms.color.value.getHex()
    }

    set color( val ){

        this.material.uniforms.color.value.set( val )
    }

    get direction(){

        return this.material.uniforms.direction.value
    }

    set direction( val ){

        this.material.uniforms.direction.value = val
    }
}
