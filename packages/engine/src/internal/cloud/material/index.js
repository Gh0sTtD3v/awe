import { ShaderMaterial, UniformsLib } from "three";

import VertexShader from "./shaders/vertex.glsl.ts";

import FragmentShader from "./shaders/fragment.glsl.ts";

export default class CloudMaterial extends ShaderMaterial {
    constructor(opts = {}) {
        var data = {};

        data.vertexShader = VertexShader;

        data.fragmentShader = FragmentShader;

        data.uniforms = {
            tInput: { value: opts.texture },
        };

        data.uniforms = Object.assign(data.uniforms, UniformsLib.fog);

        data.transparent = true;
        data.side = 0;
        data.depthWrite = false;
        data.depthTest = false;
        data.fog = true;

        super(data);
    }
}
