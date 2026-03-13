import { FPS_BAKING } from "../../../constants";

import GetMeta from './shader/meta';

import GetAdditionalMetas from './shader/additionals-meta';

import Shared from "../../../utils/globals/shared";

import InstancedToon from "../../../rendering/materials/instancedtoon"

import PreVertex  from './shader/pre.vertex.glsl.ts'

import MainVertex from './shader/main.vertex.glsl.ts'

import SuffVertex from './shader/suff.vertex.glsl.ts'

import PreFrag    from './shader/pre.frag.glsl.ts'

import MainFrag   from './shader/main.frag.glsl.ts'

import SuffFrag   from './shader/suff.frag.glsl.ts'


export default class VRMInstancedToonMaterial extends InstancedToon {

    constructor( options ) {
        // debugger;

        var metaVertex = GetMeta(options.metadata);

        var additionalMetas = GetAdditionalMetas(options.additionalMetas);

        const width = options.animationTexture.source
            ? options.animationTexture.source.data.width
            : options.animationTexture.width;

        const height = options.animationTexture.source
            ? options.animationTexture.source.data.height
            : options.animationTexture.height;

    
        options.base.updateWorldMatrix(true, true);

        options.base.bind(options.base.skeleton);
      
        let opts = {

            uniforms: {
                baseScale: {
                    value: options.scale,
                },

                bindMatrix: {
                    value: options.base.bindMatrix,
                },

                bindMatrixInverse: {
                    value: options.base.bindMatrixInverse,
                },

                boneTexture: {
                    value: options.animationTexture.texture
                        ? options.animationTexture.texture
                        : options.animationTexture,
                },

                timer: Shared.animationTimer,
                
            },

            defines: {
                FPS: 1 / FPS_BAKING,

                TEXTURE_HEIGHT: height + ".0",

                PX_WIDTH: 1.0 / width,

                PX_HEIGHT: 1.0 / height,

                META_DATA_UV_OFFSET_X: options.metadata.uvPos.x,

                META_DATA_UV_OFFSET_Y: options.metadata.uvPos.y,

                META_DATA_UV_SCALE_X: options.metadata.uvScale.x,

                META_DATA_UV_SCALE_Y: options.metadata.uvScale.y,

                META_DATA_LENGTH:
                    options.metadata.image.source.data.data.length / 4,

                ADDITIONAL_META_DATA_UV_OFFSET_X:
                    options.additionalMetas.uvPos.x,

                ADDITIONAL_META_DATA_UV_OFFSET_Y:
                    options.additionalMetas.uvPos.y,

                ADDITIONAL_META_DATA_UV_SCALE_X:
                    options.additionalMetas.uvScale.x,

                ADDITIONAL_META_DATA_UV_SCALE_Y:
                    options.additionalMetas.uvScale.y,

                ADDITIONAL_META_DATA_LENGTH:
                    options.additionalMetas.image.source.data.data.length / 4,
            },

            transparent: true,

            shadowSide: 2,

            fog: true
        }


        if (options.atlas) {
            opts.defines["USE_ATLAS"] = "1.0";
            
        }

        for (var val in opts.defines) {
            if (opts.defines[val] === 0.0) {
                opts.defines[val] += "0.0";
            }

            if (opts.defines[val] === 1.0) {
                opts.defines[val] += "0.0";
            }
        }

        opts.defines['USE_NORMAL'] = ''

        opts.defines['IS_VRM'] = ''


        // materials wont be different if we dont do this
        // with the cachekey thing
        // opts.defines['RDM ' + Math.random()] = ''

        opts.vertexShaderHooks= {

            prefix : PreVertex,
            main   : metaVertex + "\n" +additionalMetas + "\n" + MainVertex,
            suffix : SuffVertex
        }

        opts.fragmentShaderHooks = {

            prefix: PreFrag,
            main: MainFrag,
            suffix: SuffFrag
        }

        opts.plugins = options.plugins

        super(opts);

        this.opts = opts

    }

    clone() {
        return new VRMInstancedToonMaterial(this.opts);
    }
}
