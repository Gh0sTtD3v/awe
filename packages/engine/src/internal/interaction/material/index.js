import { ShaderMaterial, UniformsLib } from "three";

import VertexShader from "./shaders/vertex.glsl.ts";

import NonBillBoardVertex from './shaders/nonbillboard.glsl.ts'

import FragmentShader from "./shaders/fragment.glsl.ts";


export default class InteractionMaterial extends ShaderMaterial {
    constructor(opts = {}) {
        var data = {};

        if(opts.billboard){

            data.vertexShader = VertexShader;
           
        }
        else {

            data.vertexShader = NonBillBoardVertex
        }

        data.fragmentShader = FragmentShader;
       

        data.uniforms = {
            tInput: { value: opts.texture },
        };

        data.uniforms = Object.assign(data.uniforms, UniformsLib.fog);

        data.transparent = true;
        data.side = 2;
        data.depthWrite = false;
        data.depthTest = true;
        data.fog = true;

        super(data);
    }
}
