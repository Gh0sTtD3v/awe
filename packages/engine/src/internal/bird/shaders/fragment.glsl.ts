export default `
varying vec2 vUv;

uniform sampler2D map;

#include <fog_pars_fragment>

void main() {

	gl_FragColor = texture2D(map, vUv);

	if(gl_FragColor.a < 0.01){
		discard;
	}

	#include <colorspace_fragment>

	#include <fog_fragment>
}
`;
