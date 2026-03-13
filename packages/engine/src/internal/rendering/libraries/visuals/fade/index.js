import mainFrag from './shaders/main.frag.glsl.ts'
import preFrag from './shaders/pre.frag.glsl.ts'
import preVert from './shaders/pre.vert.glsl.ts'
import suffVert from './shaders/suff.vert.glsl.ts'


export default class FadePlugin {

    static get name(){

        return 'Fade'
    }

    constructor(){

        this.name = 'Fade'

        this.vertexShaderHooks = {

            prefix : preVert,
            suffix : suffVert
        }

        this.fragmentShaderHooks = {

            prefix    : preFrag,
            main   : mainFrag
        } 
    }
}