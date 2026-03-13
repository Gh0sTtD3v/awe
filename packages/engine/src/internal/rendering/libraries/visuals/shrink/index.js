import preFrag from './shaders/pre.frag.glsl.ts'
import suffFrag from './shaders/suff.frag.glsl.ts'

import preVert from './shaders/pre.vert.glsl.ts'
import mainVert from './shaders/main.vert.glsl.ts'
import suffVert from './shaders/suff.vert.glsl.ts'

import Shared from '../../../../utils/globals/shared'

export default class ShrinkPlugin {

    static get name(){

        return 'ShrinkPlugin'
    }

    constructor(){

        this.name = 'ShrinkPlugin'

        this.uniforms = {
            
            shrinkSpeed: {

                value: 4
            },
            
            shrinkTimer : Shared.timer,

            shrinkAmount: {

                value: 0.5
            }
        }

        this.attributes = {

            shrinkAmount: {

                name: "shrinkAmount",
                array: [],
                length: 1,
                defaultValue: 1
            }
        }

        this.vertexShaderHooks = {

            prefix : preVert,
            suffix : suffVert
        }

        this.fragmentShaderHooks = {

            prefix : preFrag,
            suffix : suffFrag
        } 

        this.defines = {

            USE_NORMAL : ''
        }
    }
}