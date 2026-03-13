import { ShaderMaterial, UniformsLib } from "three";

import VertexShader from "./shaders/vertex.glsl.ts";

import FragmentShader from "./shaders/fragment.glsl.ts";

import Shared from "../../utils/globals/shared";

export default class DustMaterial extends ShaderMaterial {
    constructor(opts = {}) {
        var data = {};

        data.vertexShader = VertexShader;

        data.fragmentShader = FragmentShader;

        data.uniforms = {
            tInput: { value: opts.texture },
            timer: Shared.timer,
        };

        data.uniforms = Object.assign(data.uniforms, UniformsLib.fog);

        data.transparent = true;
        data.side = 2;
        // data.depthTest      = false
        data.fog = true;

        super(data);
    }
}
