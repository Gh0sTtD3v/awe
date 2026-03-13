import preFrag from './shaders/pre.frag.glsl.ts'
import suffFrag from './shaders/suff.frag.glsl.ts'

import preVert from './shaders/pre.vert.glsl.ts'
import suffVert from './shaders/suff.vert.glsl.ts'

import Shared from '../../../../utils/globals/shared'

export default class DissolvePlugin {

    static get name(){

        return 'DissolvePlugin'
    }

    constructor(){

        this.name = 'DissolvePlugin'

        this.uniforms = {
            
            dissolveTimer : Shared.timer,

            dissolveDistance: {

                value: 10
            }
        }

        this.attributes = {

            dissolveDistance: {

                name: "dissolveDistance",
                array: [],
                length: 1,
                defaultValue: 10
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

        this.transparent = true

    }
}