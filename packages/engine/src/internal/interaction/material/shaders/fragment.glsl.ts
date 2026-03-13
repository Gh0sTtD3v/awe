export default `
varying vec2 vUv;

uniform sampler2D tInput;

varying vec3 vEye;

varying float vOpacity;

#define FADE_DISTANCE_MIN  30.0
#define FADE_DISTANCE_MAX  100.0

#include <fog_pars_fragment>

varying vec3 vColor;


void main(){

    gl_FragColor = texture2D( tInput, vUv );

    gl_FragColor.rgb = vColor;

    gl_FragColor.a *= vOpacity;

    if( gl_FragColor.a < 0.1 ) {

        discard;
    }
    
    // float distToCamera = smoothstep(FADE_DISTANCE_MIN ,FADE_DISTANCE_MAX, -vEye.z);

    // gl_FragColor.a = gl_FragColor.a * distToCamera;

    #include <fog_fragment>

   #include <colorspace_fragment>

}`;
