// import mainFrag from './shaders/main.frag.glsl.ts'
// import preFrag from './shaders/pre.frag.glsl.ts'
// import preVert from './shaders/pre.vert.glsl.ts'
// import suffVert from './shaders/suff.vert.glsl.ts'


import SuffFrag from './shaders/suff.frag.glsl.ts'

export default class NormalPlugin {

    static get name(){

        return 'Normal'
    }

    constructor(){

        this.name = 'Normal'

        this.vertexShaderHooks = {

     
        }

        this.fragmentShaderHooks = {

            suffix: SuffFrag
        } 
    }
}