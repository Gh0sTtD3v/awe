import preVert from './shaders/pre.vert.glsl.ts'
import suffVert from './shaders/suff.vert.glsl.ts'

import preFrag from './shaders/pre.frag.glsl.ts'
import suffFrag from './shaders/suff.frag.glsl.ts'

import Shared from '../../../../utils/globals/shared'

import { Color } from 'three'

export default class HologramPlugin {

    static pluginName = 'HologramPlugin'

    static label = 'Hologram'

    static defaults = { color: '#00ffcc', scanDensity: 40, scanSpeed: 3, flickerStrength: 0.05 }

    static get name(){

        return 'HologramPlugin'
    }

    constructor(config = {}){

        this.name = 'HologramPlugin'

        this.uniforms = {

            hologramColor: {

                value: new Color(config.color ?? '#00ffcc')
            },

            hologramScanDensity: {

                value: config.scanDensity ?? 40
            },

            hologramScanSpeed: {

                value: config.scanSpeed ?? 3
            },

            hologramFlickerStrength: {

                value: config.flickerStrength ?? 0.05
            },

            hologramTimer: Shared.timer
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

        this.transparent = true
    }

    static getGUI(dataBinding) {

        return {
            type: 'folder',
            label: 'Hologram',
            children: {
                color: {
                    type: 'color',
                    label: 'Color',
                    value: [...dataBinding, 'color'],
                },
                scanDensity: {
                    type: 'number',
                    label: 'Scan Density',
                    value: [...dataBinding, 'scanDensity'],
                    min: 1,
                    max: 100,
                    step: 1,
                },
                scanSpeed: {
                    type: 'number',
                    label: 'Scan Speed',
                    value: [...dataBinding, 'scanSpeed'],
                    min: 0,
                    max: 20,
                    step: 0.1,
                },
                flickerStrength: {
                    type: 'number',
                    label: 'Flicker Strength',
                    value: [...dataBinding, 'flickerStrength'],
                    min: 0,
                    max: 1,
                    step: 0.01,
                },
            },
        }
    }
}
