import { ShaderMaterial, Color, TextureLoader, RGBADepthPacking, RepeatWrapping, UniformsUtils, UniformsLib, Texture } from 'three'

import emitter from '../../engine-emitter'
import { EngineEvents } from '../../engine-events'

export default class QuadDepthMaterial extends ShaderMaterial {

    constructor(){

    
        let opts= {

            vertexShader: `

                attribute vec3 offset;
                attribute vec4 rotation;
                attribute vec3 scale;


                vec3 applyQuat( vec4 q, vec3 v ){

                    return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
                }

                vec3 getPosition(){


                    vec4 quat = rotation;

                    vec3 pos = position;

                    return applyQuat ( quat, ( pos * scale )) + offset;

                }

                varying vec2 vHighPrecisionZW;
                // FOG
                #include <common>
                #include <fog_pars_vertex>
                // FOG
                #include <shadowmap_pars_vertex>
                uniform sampler2D uNoiseTexture;
                uniform float uNoiseScale;
                uniform float uTime;
                
                varying vec3 vColor;
                varying vec2 vGlobalUV;
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                varying vec2 vWindColor;
                void main() {

                    vec3 position = getPosition();
                   
                    #include <color_vertex>
                    
                    // FOG
                    #include <begin_vertex>
                    #include <project_vertex>
                    // FOG
                    
                    // SHADOW
                    #include <beginnormal_vertex>
                    #include <defaultnormal_vertex>
                    #include <worldpos_vertex>
                    #include <shadowmap_vertex>
                    // SHADOW

                    // wind effect
                    vec2 uWindDirection = vec2(1.0,1.0);
                    float uWindAmp = 0.1;
                    float uWindFreq = 50.;
                    float uSpeed = 1.0;
                    float uNoiseFactor = 5.50;
                    float uNoiseSpeed = 0.001;

                    vec2 windDirection = normalize(uWindDirection); // Normalize the wind direction
                    vec4 modelPosition = vec4(position, 1.0);;

                    float terrainSize = 100.;
                    vGlobalUV = (terrainSize-vec2(modelPosition.xz))/terrainSize;

                    vec4 noise = texture2D(uNoiseTexture,vGlobalUV+uTime*uNoiseSpeed);

                    float sinWave = sin(uWindFreq*dot(windDirection, vGlobalUV) + noise.g*uNoiseFactor + uTime * uSpeed) * uWindAmp * (1.-uv.y);

                    float xDisp = sinWave;
                    float zDisp = sinWave;
                    modelPosition.x += xDisp;
                    modelPosition.z += zDisp;

                    // use perlinNoise to vary the terrainHeight of the grass
                    modelPosition.y += exp(texture2D(uNoiseTexture,vGlobalUV * uNoiseScale).r) * 0.5 * (1.-uv.y);

                    vec4 viewPosition = viewMatrix * modelPosition;
                    vec4 projectedPosition = projectionMatrix * viewPosition;
                    gl_Position = projectedPosition;

                    vUv = vec2(uv.x,1.-uv.y);
                    vHighPrecisionZW = gl_Position.zw;

                }
            `, 

            fragmentShader: `

                #include <common>
                #include <packing>

                uniform sampler2D uGrassAlphaTexture;

                varying vec2 vUv;
                
                varying vec2 vHighPrecisionZW;
                
                void main() {

                    vec4 grassAlpha = texture2D(uGrassAlphaTexture,vUv);

                    if( grassAlpha.r < 0.1 ) discard;
                
                    float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
                
                    #if (DEPTH_PACKING == 3200)
                
                        gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), 1.0 );
                
                    #elif DEPTH_PACKING == 3201
                
                        gl_FragColor = packDepthToRGBA( fragCoordZ );
                
                    #endif
                }
            
      
            `,
            uniforms : {
                alphaTest: 0.1,
                uTime: { value: 0 },
				uTipColor1: { value: new Color("#9bd38d")},
				uTipColor2: { value : new Color("#1f352a")},
				uBaseColor: { value : new Color("#313f1b")},
				uEnableShadows: { value: true },
				uShadowDarkness: { value: 0.5},
				uGrassLightIntensity: { value: 1},
				uNoiseScale: { value: 1.5},
				uNoiseTexture: { value: new Texture() },
				uGrassAlphaTexture: { value: new Texture() }
                
				
            },

            alphaTest: 0.1,
            transparent: false, 
            side: 2,
            lights: true,
            fog: true
        }
        opts.uniforms = UniformsUtils.merge( [
            opts.uniforms,
			UniformsLib.common,
			UniformsLib.specularmap,
			UniformsLib.envmap,
			UniformsLib.aomap,
			UniformsLib.lightmap,
			UniformsLib.emissivemap,
			UniformsLib.bumpmap,
			UniformsLib.normalmap,
			UniformsLib.displacementmap,
			UniformsLib.fog,
			UniformsLib.lights,
			{
				emissive: { value: /*@__PURE__*/ new Color( 0x000000 ) }
			}
		] ),

        opts.defines = {

            DEPTH_PACKING : RGBADepthPacking
        }


        super( opts )

        this.alphaTest = 0.1

        const loader = new TextureLoader()

        const rawGrassLink = 'https://raw.githubusercontent.com/thebenezer/FluffyGrass/34745a1028067e90591bd388df60117edbefa23a/public/grass.jpeg'
        const rawNoiseLink = 'https://raw.githubusercontent.com/thebenezer/FluffyGrass/34745a1028067e90591bd388df60117edbefa23a/public/perlinnoise.webp'


        loader.load(rawGrassLink, ( tex )=>{

            this.uniforms.uGrassAlphaTexture.value = tex 

            tex.needsUpdate = true 

        });
        
        loader.load(rawNoiseLink, ( tex )=>{

            tex.wrapS = tex.wrapT = RepeatWrapping

            this.uniforms.uNoiseTexture.value = tex 

            tex.needsUpdate = true 

        })

        this.addEvents()
    }

    update(delta){

        this.uniforms.uTime.value += delta
    }

    addEvents(){

        if( this.updateEvent == null ){

            this.updateEvent = this.update.bind(this)
        }

        emitter.on( EngineEvents.PRE_RENDER, this.updateEvent)
    }

    removeEvents(){
    
        if( this.updateEvent != null ){

            emitter.off(EngineEvents.PRE_RENDER , this.updateEvent )

            this.updateEvent = null
        }
    }

    dispose(){

        this.removeEvents()
        super.dispose()

    }

}

		