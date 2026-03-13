// @ts-check

import { ShaderMaterial, Color, UniformsLib } from "three"

import VertexShader from "./shaders/vertex.glsl.ts"

import FragmentShader from "./shaders/fragment.glsl.ts"


export default class PlaceHolderMaterial extends ShaderMaterial {
    constructor(op) {
        let opts = {
            vertexShader: VertexShader,
            fragmentShader: FragmentShader,
            uniforms: {
                tInput: {
                    value: op.map,
                },

                ratio: {
                    value: op.ratio
                },

                selected: {

                    value: 0
                }
                // color: {
                //     value: new Color(0x000000),
                // },
            },
            polygonOffset: true,
            polygonOffsetFactor: -2.0,
            polygonOffsetUnits: -8.0,
            fog: true
        };

        opts.uniforms =  Object.assign( opts.uniforms, UniformsLib.fog )
        
        super(opts);
    }
}
