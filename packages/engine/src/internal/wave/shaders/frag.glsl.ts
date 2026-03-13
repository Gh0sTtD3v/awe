export default `

varying vec2  vUv;

varying float loopAlpha;

varying vec3 debug;

uniform vec3 color;

#include <fog_pars_fragment>


void main() {

	float sides = sin(vUv.x * 3.1416);

	float alpha = sides * loopAlpha;
	// float alpha = sides ; ;

	// vec3 colorA = vec3(0.0, 0.5, 1.0);
	// vec3 colorB = vec3(1.0, 1.0, 1.0);

	// vec3 c = mix( colorA, colorB, vUv.y);

	if( alpha < 0.1 ) {

		discard;
	}

	gl_FragColor 	= vec4(color, alpha);
	// gl_FragColor 	= vec4(debug, 1.0);

	#ifdef OCCLUSION 

		gl_FragColor.rgb = vec3(0.0);
		
	#else

		#include <colorspace_fragment>

		#include <fog_fragment>

	#endif

 
}`;
