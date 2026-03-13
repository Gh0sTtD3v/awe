import preFrag from './shaders/pre.frag.glsl.ts'
import suffFrag from './shaders/suff.frag.glsl.ts'

import preVert from './shaders/pre.vert.glsl.ts'
import mainVert from './shaders/main.vert.glsl.ts'
import suffVert from './shaders/suff.vert.glsl.ts'

import Shared from '../../../../utils/globals/shared'

export default class RotateAndDissolvePlugin {

    static get name(){

        return 'RotateAndDissolvePlugin'
    }

    constructor(){

        this.name = 'RotateAndDissolvePlugin'

        this.uniforms = {
            
            rotateAndDissolveSpeed: {

                value: 4
            },
            
            rotateAndDissolveTimer : Shared.timer,

            rotateAndDissolveAmount: {

                value: 0.5
            }
        }

        this.attributes = {

            rotateAndDissolveAmount: {

                name: "rotateAndDissolveAmount",
                array: [],
                length: 1,
                defaultValue: 1
            }
        }

        this.vertexShaderHooks = {

            prefix : preVert,
            main   : mainVert,
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