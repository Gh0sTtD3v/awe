import { MeshBasicMaterial, MeshLambertMaterial } from "../../../xtend";

import PreVert from "./shaders/vert.pre.glsl.ts";

import MainVert from "./shaders/vert.main.glsl.ts";

import SuffVert from "./shaders/vert.suff.glsl.ts";

import PreFrag from "./shaders/frag.pre.glsl.ts";

import MainFrag from "./shaders/frag.main.glsl.ts";

import SuffFrag from "./shaders/frag.suff.glsl.ts";

import Shared from '../../../utils/globals/shared'

export class GlitchBasic extends MeshBasicMaterial {
    
    constructor(data = {}) {
        
        let opts = data;

        if (opts.defines == null) {
            opts.defines = {}
        }

        if(opts.uniforms == null){

            opts.uniforms = {}
        }

        opts.uniforms.timer = Shared.timer
        opts.uniforms.texture_ratio = 1.0

        opts.vertexShaderHooks = {
            prefix: data?.vertexShaderHooks?.prefix
                ? data.vertexShaderHooks?.prefix
                : PreVert,

            main: data?.vertexShaderHooks?.main
                ? data.vertexShaderHooks?.main
                : MainVert,

            suffix: data?.vertexShaderHooks?.suffix
                ? data.vertexShaderHooks?.suffix
                : SuffVert,
        };

        opts.fragmentShaderHooks = {
            prefix: data?.fragmentShaderHooks?.prefix
                ? data.fragmentShaderHooks?.prefix
                : PreFrag,

            main: data?.fragmentShaderHooks?.main
                ? data.fragmentShaderHooks?.main
                : MainFrag,

            suffix: data?.fragmentShaderHooks?.suffix
                ? data.fragmentShaderHooks?.suffix
                : SuffFrag,
        };

        if( data.plugins && data.plugins.length ){

            opts.plugins = data.plugins;
        }

        super(opts);
    }
}


export class GlitchLambert extends MeshLambertMaterial {
    
    constructor(data = {}) {
        
        let opts = data;

        if (opts.defines == null) {
            opts.defines = {}
        }
        if(opts.uniforms == null){

            opts.uniforms = {}
        }

        opts.uniforms.timer = Shared.timer
        opts.uniforms.texture_ratio = 1.0

        opts.vertexShaderHooks = {
            prefix: data?.vertexShaderHooks?.prefix
                ? data.vertexShaderHooks?.prefix
                : PreVert,

            main: data?.vertexShaderHooks?.main
                ? data.vertexShaderHooks?.main
                : MainVert,

            suffix: data?.vertexShaderHooks?.suffix
                ? data.vertexShaderHooks?.suffix
                : SuffVert,
        };

        opts.fragmentShaderHooks = {
            prefix: data?.fragmentShaderHooks?.prefix
                ? data.fragmentShaderHooks?.prefix
                : PreFrag,

            main: data?.fragmentShaderHooks?.main
                ? data.fragmentShaderHooks?.main
                : MainFrag,

            suffix: data?.fragmentShaderHooks?.suffix
                ? data.fragmentShaderHooks?.suffix
                : SuffFrag,
        };

        if( data.plugins && data.plugins.length ){

            opts.plugins = data.plugins;
        }

        super(opts);
    }
}