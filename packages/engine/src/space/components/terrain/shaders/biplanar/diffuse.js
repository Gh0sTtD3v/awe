import {
    MeshBasicMaterial,
    Texture,
    RepeatWrapping,
    LinearFilter,
} from "three";

import MapFragment from "./shaders/mapfragment.glsl.ts";
import MapParsFragment from "./shaders/mapparsfragment.glsl.ts";
import { FRONT_END } from "../../../../../internal/constants";
import { Assets } from "../../../../../internal/resources/assets";
import Shared from "../../../../../internal/utils/globals/shared";



const noiseMap = new Texture();

{
    let noise = FRONT_END ? new Image() : {};

    noise.src = Assets.textures.noiseDiffuse;

    noiseMap.image = noise;
    noiseMap.wrapS = RepeatWrapping;
    noiseMap.wrapT = RepeatWrapping;
    noiseMap.generateMipmaps = false;
    noiseMap.minFilter = LinearFilter;
    noiseMap.magFilter = LinearFilter;
    noiseMap.needsUpdate = true;
}


export default class DiffuseMaterial extends MeshBasicMaterial {

    constructor(opts) {
        // let opts = {

        //     vertexShaderHooks: {

        //         prefix: PreVert,

        //         main: MainVert,

        //         suffix: SuffVert
        //     },

        //     fragmentShaderHooks: {

        //         prefix: PreFrag,

        //         main:  MainFrag,

        //         suffix: SuffFrag
        //     },

        //     uniforms: {

        //     },

        //     shadowSide: 2,

        //     side: 2,

        //     fog :true,

        //     derivatives: true

        // }

        super({
            shadowSide: 2,

            side: 2,

            fog: true,
        });

        this.uniforms = {
            edgeTransition: {
                value: opts.edgeTransition,
            },

            noTileDisplacement: {
                value: opts.noTileDisplacement,
            },

            noiseMap: {
                value: noiseMap,
            },

            sideMap: {
                value: null,
            },

            smoothAngle: {
                value: opts.smoothAngle,
            },
        };

        this.color.set(opts.color);

        this.name = "diffuse_shader";

        this.onBeforeCompile = (shader) => {
            //replace shader chunks with box projection chunks

            shader.uniforms.fogFadeColor = Shared.fogFadeColor;
            shader.uniforms.fogTexture = Shared.fogTexture;
            shader.uniforms.fogTextureEnabled = Shared.fogTextureEnabled;
            shader.uniforms.fogTextureCubeUVSize = Shared.fogTextureCubeUVSize;

            shader.uniforms = Object.assign(shader.uniforms, this.uniforms);

            this.uniforms = shader.uniforms;

            shader.vertexShader = shader.vertexShader.replace(
                "#include <clipping_planes_pars_vertex>",
                "#include <clipping_planes_pars_vertex>\n" +
                    "varying vec3 datWorldPosition;\n" +
                    "varying vec3 originalNormal;\n" +
                    "varying vec3 datNormal;\n",
            );

            shader.vertexShader = shader.vertexShader.replace(
                "void main() {",
                "void main() {\n" +
                    "originalNormal = normalize(vec3(modelMatrix * vec4(normal, 0.0)).xyz);\n" +
                    "datNormal = (mat3(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz) * normal);",
                // 'datNormal = normal;'
            );

            shader.vertexShader = shader.vertexShader.replace(
                "#include <fog_vertex>",
                "#include <fog_vertex>\n" +
                    "datWorldPosition = ((mapTransform[0][0]) / 500.0) * (modelMatrix * vec4( transformed, 1.0 )).xyz;",
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                "#include <map_pars_fragment>",
                MapParsFragment,
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                "#include <map_fragment>",
                MapFragment,
            );
        };

        // globalThis.hahaha = this;
    }

    set edgeTransition(val) {
        this.uniforms.edgeTransition.value = val;
    }

    get edgeTransition() {
        return this.uniforms.edgeTransition.value;
    }

    set noTileDisplacement(val) {
        this.uniforms.noTileDisplacement.value = val;
    }

    get noTileDisplacement() {
        return this.uniforms.noTileDisplacement.value;
    }

    set smoothAngle(val) {
        this.uniforms.smoothAngle.value = val;
    }

    get smoothAngle() {
        return this.uniforms.smoothAngle.value;
    }

    set sideMap(val) {
        this.uniforms.sideMap.value = val;
    }

    get sideMap() {
        return this.uniforms.sideMap.value;
    }

    setRatio() {}
}

