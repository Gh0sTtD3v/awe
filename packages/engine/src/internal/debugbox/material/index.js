import { ShaderMaterial, Color } from "three";

import VertexShader from "./shaders/vert.glsl.ts";

import FragmentShader from "./shaders/frag.glsl.ts";

export default class DebugMaterial extends ShaderMaterial {
    constructor(color = 0xffffff, opacity = 1) {
        let opts = {
            vertexShader: VertexShader,

            fragmentShader: FragmentShader,

            uniforms: {
                color: {
                    value: new Color(color),
                },

                opacity: {
                    value: opacity,
                },
            },

            transparent: true,

            side: 0,
        };

        super(opts);
    }
}
