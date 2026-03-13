import { ShaderMaterial } from "three";

import VertexShader from "./shaders/vertex.glsl.ts";

import FragmentShader from "./shaders/fragment.glsl.ts";

export default class Material extends ShaderMaterial {
    constructor(op) {
        let opts = {
            uniforms: {
                tInput: {
                    value: op.tex,
                },
            },

            side: 2,

            vertexShader: VertexShader,

            fragmentShader: FragmentShader,

            transparent: true,
        };

        super(opts);

        this.occlusionMaterial = new ShaderMaterial(opts);
    }
}
