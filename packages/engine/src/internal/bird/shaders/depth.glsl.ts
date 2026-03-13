export default `
#include <common>
#include <packing>

varying vec2 vUv;

uniform sampler2D map;

varying vec2 vHighPrecisionZW;

void main() {

	vec4 color = texture2D(map, vUv);

	if(color.a < 0.01){
		discard;
	}

    float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;

    gl_FragColor = packDepthToRGBA( fragCoordZ );
    
}
`;
