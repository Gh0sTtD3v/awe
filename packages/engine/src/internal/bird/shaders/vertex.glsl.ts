import transformposition from '../../rendering/materials/common/transformposition.glsl.ts';

export default `
attribute float vertexAnimation;

attribute vec3 offset;

attribute vec4 rotation;

attribute vec3 scale;

uniform float timer;

attribute float randomID;

mat3 calcLookAtMatrix(vec3 origin, vec3 target, float roll) {
  vec3 rr = vec3(sin(roll), cos(roll), 0.0);
  vec3 ww = normalize(target - origin);
  vec3 uu = normalize(cross(ww, rr));
  vec3 vv = normalize(cross(uu, ww));

  return mat3(uu, vv, ww);
}
varying vec2 vUv;

vec3 calcPos( float t, float radius, vec3 center ){

    return vec3(
        radius * cos( t ) + center.x,
        center.y + sin(t * 2.0),
        radius * sin( t ) + center.z
    );
   
}

float nrand( vec2 n )
{
	return fract(sin(dot(n.xy, vec2(12.9898, 78.233)))* 43758.5453);
}

varying vec2 vHighPrecisionZW;

float when_gt(float x, float y) {
  return max(sign(x - y), 0.0);
}

#include <fog_pars_vertex>


${transformposition}

void main() {

    
    #ifdef ANIMATED

        float randomFloat = nrand( vec2(offset.x, offset.z) );
        // float randDirection = nrand( offset.xy * 40.0);
        float randDirection = nrand( vec2(offset.z, offset.x) );

    #else

        float randomFloat = nrand( vec2(randomID) * 40.0);
        // float randDirection = nrand( offset.xy * 40.0);
        float randDirection = nrand( vec2(randomID) * 10.0);

    #endif

    float rT = ( randomFloat + timer) * mix( when_gt( randDirection, 0.5 ), -1.0, 1.0);

	vUv = uv;

	vec3 p = vec3( position);

	float range = 1.0;

	float t = (rT * 16. * mix(0.8, 1.2, range)) + range;
	p.y = (sin( t ) + 1.) * vertexAnimation;
 
    #ifdef ANIMATED

        vec3 cPos = calcPos( rT, 5.0, offset );
        vec3 target = calcPos( rT + 0.01, 5.0, offset );
        mat3 camMat = calcLookAtMatrix(target,cPos,0.0);

	    vec3 transformed = (p * camMat) * 0.4 * scale + cPos;

    
    #else

        vec3 transformed = getPositionWithOptions( p, scale * 0.4, rotation, offset);

    
    #endif



    vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );

	gl_Position = projectionMatrix * mvPosition;

    vHighPrecisionZW = gl_Position.zw;

    #include <worldpos_vertex>

    #include <fog_vertex>

}
`;
