import PreVert from "./shaders/vert.pree.glsl.ts";
import MainVert from "./shaders/vert.main.glsl.ts";
import SuffVert from "./shaders/vert.suff.glsl.ts";

import PreFrag from "./shaders/frag.pre.glsl.ts";
import MainFrag from "./shaders/frag.main.glsl.ts";
// import SuffFrag from './shaders/frag.suff.glsl.ts'

import { MeshBasicMaterial } from "../../../../../internal/xtend";

import {
    Color
} from "three";

export default class DiffuseMaterial extends MeshBasicMaterial {
    constructor(data) {
        let opts = {
            vertexShaderHooks: {
                prefix: PreVert,

                main: MainVert,

                suffix: SuffVert,
            },

            fragmentShaderHooks: {
                prefix: PreFrag,

                main: MainFrag,

                // suffix: SuffFrag
            },

            uniforms: {

                lineWidth: {

                    value: data.lineWidth
                },

                gridColor: {
                
                    value: new Color( data.gridColor )
                },
                div: {
                    value: data.griddiv,
                },

                size: {
                    value: data.gridsize,
                },
            },

            shadowSide: 2,

            side: 2,

            fog: true,

            derivatives: true,
        };

        super(opts);

        this.color.set(data.color);

        this.name = "grid_shader_diffuse";

        this.uniforms = opts.uniforms;

        this.customProgramCacheKey = function () {
            return "grid_shader_diffuse";
        };
    }

    setRatio() {}
}
