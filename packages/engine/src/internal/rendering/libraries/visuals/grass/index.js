import PreVert from './shaders/pre.vert.glsl.ts'
import MainVert from './shaders/main.vert.glsl.ts'
import SuffVert from './shaders/suff.vert.glsl.ts'

import Shared from '../../../../utils/globals/shared'

export default class GrassPlugin {

    static get name(){

        return 'GrassPlugin'
    }

    constructor(){

        this.name = 'GrassPlugin'

        this.uniforms = {
            
            grassSpeed: Shared.timer,
        }

      
        this.defines = {

            USE_COLOR : 1
        }
        
        this.vertexShaderHooks = {

            main: MainVert,

            prefix: PreVert,

            suffix : SuffVert
        }

        this.side = 2

        // this.transparent = true
    }
}
