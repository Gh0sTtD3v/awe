// @ts-check

import { Color, ShaderMaterial } from "three";

import VertexShader from "./shaders/vert.glsl.ts";

import FragmentShader from "./shaders/frag.glsl.ts";

import Shared from "../utils/globals/shared";

import { UniformsLib } from "three";

export default class WaveMaterial extends ShaderMaterial {
    constructor(opt) {
        let opts = {
            vertexShader: VertexShader,

            fragmentShader: FragmentShader,

            uniforms: {

                direction : {
                    
                    value: opt.direction
                },

                timer: Shared.timer,

                invaspect: Shared.invaspect,

                aspect: Shared.aspect,

                invresolution: Shared.invresolution,

                resolution: Shared.resolution,

                height: {
                    value: opt.height,
                },
                radius: {
                    value: opt.radius,
                },
                linewidth: {
                    value: opt.linewidth,
                },
                lineHeight: {
                    value: opt.lineHeight,
                },
                divisions: {
                    value: 1 / opt.divisions
                },
                color: {
                    value: new Color(opt.color ?? 0xffffff),
                },
            },

          

            fog: true,

            transparent: true,

            side: 2,
        };

        opts.uniforms = Object.assign(opts.uniforms, UniformsLib.fog);

        // @ts-ignore
        super(opts);
    }

}
