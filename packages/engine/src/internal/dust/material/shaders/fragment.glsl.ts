export default `
varying vec2 vUv;

uniform sampler2D tInput;

varying vec3 vEye;


#define FADE_DISTANCE_MIN  30.0
#define FADE_DISTANCE_MAX  100.0

#include <fog_pars_fragment>


void main(){

    gl_FragColor = texture2D( tInput, vUv );

    if( gl_FragColor.a < 0.01 ) {
        discard;
    }

    #include <fog_fragment>

    #include <colorspace_fragment>
}`;
