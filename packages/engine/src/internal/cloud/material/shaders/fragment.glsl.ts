export default `
varying vec2 vUv;

uniform sampler2D tInput;

varying vec3 vEye;

varying float vAlpha;

#include <fog_pars_fragment>

void main(){

    gl_FragColor = texture2D( tInput, vUv );

    gl_FragColor.a *= vAlpha;

    #include <colorspace_fragment>

    #include <fog_fragment>

}`;
