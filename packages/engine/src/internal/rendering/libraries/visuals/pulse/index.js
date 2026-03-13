import preFrag from './shaders/pre.frag.glsl.ts'
import suffFrag from './shaders/suff.frag.glsl.ts'

import Shared from '../../../../utils/globals/shared'

import { Color } from 'three'

export default class PulsePlugin {

    static pluginName = 'PulsePlugin'

    static label = 'Pulse'

    static defaults = { speed: 2, intensity: 0.5, color: '#ffffff' }

    static get name(){

        return 'PulsePlugin'
    }

    constructor(config = {}){

        this.name = 'PulsePlugin'

        this.uniforms = {

            pulseSpeed: {

                value: config.speed ?? 2
            },

            pulseIntensity: {

                value: config.intensity ?? 0.5
            },

            pulseColor: {

                value: new Color(config.color ?? '#ffffff')
            },

            pulseTimer: Shared.timer
        }

        this.vertexShaderHooks = {}

        this.fragmentShaderHooks = {

            prefix : preFrag,
            suffix : suffFrag
        }

        this.defines = {}
    }

    static getGUI(dataBinding) {

        return {
            type: 'folder',
            label: 'Pulse',
            children: {
                speed: {
                    type: 'number',
                    label: 'Speed',
                    value: [...dataBinding, 'speed'],
                    min: 0,
                    max: 20,
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
                color: {
                    type: 'color',
                    label: 'Color',
                    value: [...dataBinding, 'color'],
                },
            },
        }
    }
}
