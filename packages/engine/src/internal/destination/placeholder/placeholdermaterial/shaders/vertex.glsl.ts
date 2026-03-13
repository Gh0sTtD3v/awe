export default `
varying vec2 vUv;

uniform sampler2D tInput;

varying vec3 emissiveColor;

uniform float selected;

uniform float ratio;

varying vec3 vNormal;

 float when_gt(float x, float y) {
   return max(sign(x - y), 0.0);
 }

 vec2 correctRatio(vec2 inUv, float baseratio, float asp){

     return mix(
         vec2(
             inUv.x,
             inUv.y * baseratio / asp + .5 * ( 1. - baseratio / asp )
         ),
         vec2(
             inUv.x * asp / baseratio + .5 * ( 1. - asp / baseratio),
             inUv.y
         )
         ,when_gt(baseratio, asp)
     );
 }


#include <fog_pars_vertex>

void main() {

	vNormal = normal;

	emissiveColor =  mix( vec3(0.0), vec3(0.0, 1.0, 0.0), selected );

	vUv = correctRatio( uv, 1.0, ratio ) ;

    vec3 transformed = position;

    vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );


    #include <worldpos_vertex>

    #include <fog_vertex>


	gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, 1.0 );
}
`;
