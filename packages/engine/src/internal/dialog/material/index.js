import { ShaderMaterial, UniformsLib, Color, Vector3} from "three";

import VertexShader from "./shaders/vertex.glsl.ts";

import FragmentShader from "./shaders/fragment.glsl.ts";

import Shared from "../../utils/globals/shared";

export default class DialogBackgroundMaterial extends ShaderMaterial {
    constructor(opts = {}) {
        var data = {};

        data.vertexShader = VertexShader;

        data.fragmentShader = FragmentShader;

        data.uniforms = {
            opacity: {
                value: opts.opacity
            },
            color: {
                value: new Color(opts.color)
            }
        };

        data.uniforms = Object.assign(data.uniforms, UniformsLib.fog);

        data.transparent = true;
        data.side = 2;
        data.fog = true;

        super(data);
    }
}
