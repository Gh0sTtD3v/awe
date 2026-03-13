import { ShaderMaterial, Color, TextureLoader, RepeatWrapping, UniformsUtils, UniformsLib, Texture } from 'three'

import emitter from '../../engine-emitter'
import { EngineEvents } from '../../engine-events'

export default class QuadMaterial extends ShaderMaterial {

    constructor( data ){

    
        let opts= {

            vertexShader: `

                attribute vec3 offset;
                attribute vec4 rotation;
                attribute vec3 scale;

                float nrand( vec2 n )
                {
                    return fract(sin(dot(n.xy, vec2(12.9898, 78.233)))* 43758.5453);
                }

                vec3 applyQuat( vec4 q, vec3 v ){

                    return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
                }

                vec3 getPosition(){


                    vec4 quat = rotation;

                    vec3 pos = position;

                    return applyQuat ( quat, ( pos * scale )) + offset;

                }


                // FOG
                #include <common>
                #include <fog_pars_vertex>
                // FOG
                #include <shadowmap_pars_vertex>
                uniform sampler2D uNoiseTexture;
                uniform float uNoiseScale;
                uniform float uTime;

                uniform float colorRepartition;
                
                varying vec3 vColor;
                varying vec2 vGlobalUV;
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                varying vec2 vWindColor;
                varying vec4 localworldPosition;

                varying vec3 baseColor;
                varying vec3 tipCol1;
                varying vec3 tipCol2;

                uniform vec3 uBaseColor;
                uniform vec3 uTipColor1;
                uniform vec3 uTipColor2;

                uniform vec3 uBaseColor2;
                uniform vec3 uTipColor3;
                uniform vec3 uTipColor4;

                float when_gt(float x, float y) {
                    return max(sign(x - y), 0.0);
                }

                  
                void main() {   

                    float r = rand( vec2( offset.x +  offset.y, offset.z ) * 10.0 );

                    float a = when_gt(r,colorRepartition);

                    baseColor = mix( uBaseColor, uBaseColor2,  a);

                    tipCol1 = mix( uTipColor1, uTipColor3, a );

                    tipCol2 = mix( uTipColor2, uTipColor4, a );

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
                    float uNoiseSpeed = 0.002;

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

                    // assign varyings
                    vUv = vec2(uv.x,1.-uv.y);
                    vNormal = normalize(normalMatrix * normal);
                    vWindColor = vec2(xDisp,zDisp);
                    vViewPosition = mvPosition.xyz;
                    localworldPosition = vec4( modelMatrix * vec4(position, 1.0) );

                    #include <fog_vertex>

                }
            `, 

            fragmentShader: `

                #include <alphatest_pars_fragment>
                #include <alphamap_pars_fragment>
                // FOG
                #include <fog_pars_fragment>
                // FOG

                #include <common>
                #include <packing>
                #include <lights_pars_begin>
                #include <shadowmap_pars_fragment>
                #include <shadowmask_pars_fragment>
                
                uniform float uTime;
             
                uniform sampler2D uGrassAlphaTexture;
                uniform sampler2D uNoiseTexture;
                uniform float uNoiseScale;
                uniform int uEnableShadows;
                
                uniform float uGrassLightIntensity;
                uniform float uShadowDarkness;
                // uniform float uDayTime;
                varying vec3 vColor;
                
                varying vec2 vUv;
                varying vec2 vGlobalUV;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                varying vec2 vWindColor;

                varying vec3 baseColor;
                varying vec3 tipCol1;
                varying vec3 tipCol2;
                
                void main() {
                    vec4 grassAlpha = texture2D(uGrassAlphaTexture,vUv);

                    vec4 grassVariation = texture2D(uNoiseTexture, vGlobalUV * uNoiseScale);
                    vec3 tipColor = mix(tipCol1,tipCol2,grassVariation.r);
                    
                    vec4 diffuseColor = vec4( mix(baseColor,tipColor,vUv.y), step(0.1,grassAlpha.r) );
                    vec3 grassFinalColor = diffuseColor.rgb * uGrassLightIntensity;
                    
                    // light calculation derived from <lights_fragment_begin>
                    vec3 geometryPosition = vViewPosition;
                    vec3 geometryNormal = vNormal;
                    vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
                    vec3 geometryClearcoatNormal;
                    IncidentLight directLight;
                    float shadow = 0.0;
                    float currentShadow = 0.0;
                    float NdotL;
                    float weight;
                    if(uEnableShadows == 1){
                        #if ( NUM_DIR_LIGHTS > 0) 
                        DirectionalLight directionalLight;
                        #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
                        DirectionalLightShadow directionalLightShadow;
                        #endif
                        #pragma unroll_loop_start
                        for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
                            directionalLight = directionalLights[ i ];
                            getDirectionalLightInfo( directionalLight, directLight );
                            directionalLightShadow = directionalLightShadows[ i ];
                            currentShadow = getShadow( directionalShadowMap[ i ], 
                            directionalLightShadow.shadowMapSize, 
                            directionalLightShadow.shadowBias, 
                            directionalLightShadow.shadowRadius, 
                            vDirectionalShadowCoord[ i ] );
                            currentShadow = all( bvec2( directLight.visible, receiveShadow ) ) ? currentShadow : 1.0;
                            weight = clamp( pow( length( vDirectionalShadowCoord[ i ].xy * 2. - 1. ), 4. ), .0, 1. );

                            shadow += mix( currentShadow, 1., weight);
                        }
                        #pragma unroll_loop_end
                        #endif
                        grassFinalColor = mix(grassFinalColor , grassFinalColor * uShadowDarkness,  1.-shadow) ;
                    } else{
                        grassFinalColor = grassFinalColor ;
                    }
                    diffuseColor.rgb = clamp(diffuseColor.rgb*shadow,0.0,1.0);

                     if ( diffuseColor.a < 0.1 ) discard;
                    gl_FragColor = vec4(grassFinalColor ,1.0);
                    

                    // uncomment to visualize wind
                    // vec3 windColorViz = vec3((vWindColor.x+vWindColor.y)/2.);
                    // gl_FragColor = vec4(windColorViz,1.0);
                    
                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>

                    // FOG
                    #include <fog_fragment>
                    // FOG

                }
      
            `,
            uniforms : {
                alphaTest: 0.1,
                uTime: { value: 0 },
				uTipColor1: { value: new Color(data.uTipColor1)},
				uTipColor2: { value : new Color(data.uTipColor2)},
				uBaseColor: { value : new Color(data.uBaseColor)},
                uTipColor3: { value: new Color(data.uTipColor3)},
				uTipColor4: { value : new Color(data.uTipColor4)},
				uBaseColor2: { value : new Color(data.uBaseColor2)},
				uEnableShadows: { value: true },
				uShadowDarkness: { value: 0.5},
				uGrassLightIntensity: { value: 1},
                colorRepartition: { value: data.colorRepartition},
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

    updateColors(data){

        this.uniforms.uBaseColor.value.setHex(data.uBaseColor)
        this.uniforms.uTipColor1.value.setHex(data.uTipColor1)
        this.uniforms.uTipColor2.value.setHex(data.uTipColor2)
        this.uniforms.uBaseColor2.value.setHex(data.uBaseColor2)
        this.uniforms.uTipColor3.value.setHex(data.uTipColor3)
        this.uniforms.uTipColor4.value.setHex(data.uTipColor4)

        this.uniforms.colorRepartition.value = data.colorRepartition

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

		