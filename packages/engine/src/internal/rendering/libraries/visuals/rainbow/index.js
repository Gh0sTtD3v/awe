import preFrag from './shaders/pre.frag.glsl.ts'
import suffFrag from './shaders/suff.frag.glsl.ts'

import preVert from './shaders/pre.vert.glsl.ts'
import suffVert from './shaders/suff.vert.glsl.ts'

import Shared from '../../../../utils/globals/shared'

export default class RainbowPlugin {

    static pluginName = 'RainbowPlugin'

    static label = 'Rainbow'

    static defaults = { speed: 4, amount: 1 }

    static get name(){

        return 'RainbowPlugin'
    }

    constructor(config = {}){

        this.name = 'RainbowPlugin'

        this.uniforms = {

            rainbowSpeed: {

                value: config.speed ?? 4
            },

            rainbowTimer : Shared.timer,

            rainbowAmount: {

                value: config.amount ?? 1
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

    static getGUI(dataBinding) {

        return {
            type: 'folder',
            label: 'Rainbow',
            children: {
                speed: {
                    type: 'number',
                    label: 'Speed',
                    value: [...dataBinding, 'speed'],
                    min: 0,
                    max: 20,
                    step: 0.1,
                },
                amount: {
                    type: 'number',
                    label: 'Amount',
                    value: [...dataBinding, 'amount'],
                    min: 0,
                    max: 5,
                    step: 0.1,
                },
            },
        }
    }
}