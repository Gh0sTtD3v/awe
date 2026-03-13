import { ShaderMaterial, GLSL3, DoubleSide, Color } from "three";

import vertexShader   from './shaders/vert.glsl.ts'

import fragmentShader from './shaders/frag.glsl.ts'

var config = {

    baseColor: '#000000',
    majorLineColor: '#ffffff',
    minorLineColor: '#dddddd',
    xAxisColor: '#FF3838',
    zAxisColor: '#2ABEFE',
    yAxisColor: '#28D348'
}

export default class GridMaterial extends ShaderMaterial {

    constructor(){

        super({
        side: DoubleSide,
        glslVersion: GLSL3,
        transparent: true,
        depthWrite: false,
        name: 'Plane',
        vertexShader,
        fragmentShader,

        polygonOffset: true,

        polygonOffsetFactor: -2.0,

        polygonOffsetUnits: -8.0,
        uniforms: {
            mode : { value: 0},
            u_baseAlpha: { value: 0.0 },
            u_majorLineWidth: { value: 0.04 }, // Example default value, adjust as needed
            u_minorLineWidth: { value: 0.01 }, // Example default value
            u_axisLineWidth: { value: 0.075 }, // Example default value
            u_majorGridDiv: { value: 4.0 }, // Example default value
            u_gridDiv: { value: 1 }, // Example default value
            u_majorLineColor: { value: new Color(config.majorLineColor) }, // White color
            u_minorLineColor: { value: new Color(config.minorLineColor) }, // White color
            u_baseColor: { value: new Color(config.baseColor) }, // Black color
            u_xAxisColor: { value: new Color(config.xAxisColor) }, // Red color
            u_zAxisColor: { value: new Color(config.zAxisColor) }, // Blue c
        },
        })

        this.renderOrder = -Infinity
    }

    setMode( mode ){

        switch( mode ) {

            case 'XZ':
                this.uniforms.u_xAxisColor.value.set(config.xAxisColor)
                this.uniforms.u_zAxisColor.value.set(config.zAxisColor)
                this.uniforms.mode.value = 0
                break

            case 'XY':
                this.uniforms.u_xAxisColor.value.set(config.xAxisColor)
                this.uniforms.u_zAxisColor.value.set(config.yAxisColor)
                this.uniforms.mode.value = 1
                break

            case 'YZ':
                this.uniforms.u_xAxisColor.value.set(config.yAxisColor)
                this.uniforms.u_zAxisColor.value.set(config.zAxisColor)
                this.uniforms.mode.value = 2
                break
        }
        
    }
}