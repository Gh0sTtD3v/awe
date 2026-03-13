import preVert from './shaders/pre.vert.glsl.ts'
import suffVert from './shaders/suff.vert.glsl.ts'

import preFrag from './shaders/pre.frag.glsl.ts'
import suffFrag from './shaders/suff.frag.glsl.ts'

import Shared from '../../../../utils/globals/shared'

import { Color } from 'three'

export default class FresnelGlowPlugin {

    static pluginName = 'FresnelGlowPlugin'

    static label = 'Fresnel Glow'

    static defaults = { power: 2, intensity: 1.5, speed: 2, pulse: 1, color: '#00ccff' }

    static get name(){

        return 'FresnelGlowPlugin'
    }

    constructor(config = {}){

        this.name = 'FresnelGlowPlugin'

        this.uniforms = {

            fresnelPower: {

                value: config.power ?? 2
            },

            fresnelIntensity: {

                value: config.intensity ?? 1.5
            },

            fresnelSpeed: {

                value: config.speed ?? 2
            },

            fresnelColor: {

                value: new Color(config.color ?? '#00ccff')
            },

            fresnelPulseAmount: {

                value: config.pulse ?? 1
            },

            fresnelTimer: Shared.timer
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
            label: 'Fresnel Glow',
            children: {
                power: {
                    type: 'number',
                    label: 'Power',
                    value: [...dataBinding, 'power'],
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                },
                intensity: {
                    type: 'number',
                    label: 'Intensity',
                    value: [...dataBinding, 'intensity'],
                    min: 0,
                    max: 5,
                    step: 0.1,
                },
                speed: {
                    type: 'number',
                    label: 'Speed',
                    value: [...dataBinding, 'speed'],
                    min: 0,
                    max: 20,
                    step: 0.1,
                },
                pulse: {
                    type: 'number',
                    label: 'Pulse',
                    value: [...dataBinding, 'pulse'],
                    min: 0,
                    max: 1,
                    step: 0.01,
                },
                color: {
                    type: 'color',
                    label: 'Color',
                    value: [...dataBinding, 'color'],
                },
            },
        }
    }
}
