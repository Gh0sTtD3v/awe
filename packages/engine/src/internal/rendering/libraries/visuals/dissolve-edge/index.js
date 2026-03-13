import preVert from './shaders/pre.vert.glsl.ts'
import suffVert from './shaders/suff.vert.glsl.ts'

import preFrag from './shaders/pre.frag.glsl.ts'
import suffFrag from './shaders/suff.frag.glsl.ts'

import { Color } from 'three'

export default class DissolveEdgePlugin {

    static pluginName = 'DissolveEdgePlugin'

    static label = 'Dissolve Edge'

    static defaults = { threshold: -5, edgeWidth: 0.15, edgeColor: '#ff6600' }

    static get name(){

        return 'DissolveEdgePlugin'
    }

    constructor(config = {}){

        this.name = 'DissolveEdgePlugin'

        this.uniforms = {

            dissolveThreshold: {

                value: config.threshold ?? -5
            },

            dissolveEdgeWidth: {

                value: config.edgeWidth ?? 0.15
            },

            dissolveEdgeColor: {

                value: new Color(config.edgeColor ?? '#ff6600')
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

        this.defines = {}
    }

    static getGUI(dataBinding) {

        return {
            type: 'folder',
            label: 'Dissolve Edge',
            children: {
                threshold: {
                    type: 'number',
                    label: 'Threshold',
                    value: [...dataBinding, 'threshold'],
                    min: -10,
                    max: 10,
                    step: 0.05,
                },
                edgeWidth: {
                    type: 'number',
                    label: 'Edge Width',
                    value: [...dataBinding, 'edgeWidth'],
                    min: 0.01,
                    max: 1,
                    step: 0.01,
                },
                edgeColor: {
                    type: 'color',
                    label: 'Edge Color',
                    value: [...dataBinding, 'edgeColor'],
                },
            },
        }
    }
}
