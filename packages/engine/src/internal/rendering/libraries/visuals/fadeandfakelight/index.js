import mainFrag from './shaders/main.frag.glsl.ts'
import preFrag from './shaders/pre.frag.glsl.ts'
import preVert from './shaders/pre.vert.glsl.ts'
import suffVert from './shaders/suff.vert.glsl.ts'


export default class FadeAndFakeLightPlugin {

    static get name(){

        return 'FadeAndFakeLight'
    }

    constructor(){

        this.name = 'FadeAndFakeLight'

        this.vertexShaderHooks = {

            prefix : preVert,
            suffix : suffVert
        }

        this.fragmentShaderHooks = {

            prefix    : preFrag,
            main   : mainFrag
        } 

        this.defines = {

            USE_NORMAL : ''
        }
    }
}