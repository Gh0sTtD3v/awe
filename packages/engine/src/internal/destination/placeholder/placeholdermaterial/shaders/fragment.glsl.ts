export default `
varying vec2 vUv;
varying float sides;

varying vec3 emissiveColor;

uniform sampler2D tInput;

uniform float selected;

varying vec3 vNormal;

float when_gt(float x, float y) {
   return max(sign(x - y), 0.0);
}

#include <fog_pars_fragment>

void main() {

	vec4 final = texture2D(tInput, vUv);

	final.rgb *= (1.0 - selected);

	final = mix( vec4(emissiveColor, 1.0) ,final, final.a);

    gl_FragColor =  vec4(  mix( final.rgb, vec3((0.0 - selected)), when_gt( 0.5,  abs(vNormal.z) )), 1.0);

	#include <fog_fragment>

}
`;
