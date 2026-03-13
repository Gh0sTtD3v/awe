import { MeshShadowMaterial } from "../../../xtend";

import PreVert from "./shaders/vert.pre.glsl.ts";

import MainVert from "./shaders/vert.main.glsl.ts";

import SuffVert from "./shaders/vert.suff.glsl.ts";

import PreFrag from "./shaders/frag.pre.glsl.ts";

import MainFrag from "./shaders/frag.main.glsl.ts";

import SuffFrag from "./shaders/frag.suff.glsl.ts";

export default class InstancedShadow extends MeshShadowMaterial {
    constructor(data = {}) {
        
        let opts = Object.assign({},data)

        if (opts.defines == null) {
            opts.defines = {};
        }

        opts.defines["INSTANCE"] = "";
        opts.defines["SHADOW"]   = "";

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

        // cannot override the fragment shader since this is a shadow only material 

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


        if( data.plugins && data.plugins.length > 0 ){

            opts.plugins = data.plugins;
        }


        super(opts)
    }
}
