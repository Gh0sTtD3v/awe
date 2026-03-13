export default `
uniform float timer;
uniform float invaspect;
uniform vec2  invresolution;
uniform float aspect;


uniform vec2 resolution;

uniform float linewidth;
uniform float lineHeight;

varying vec2  vUv;

attribute float offset;

varying float loopAlpha;


#ifdef USE_FOG
	
	uniform float fogNear;

	uniform float fogFar;

#endif

uniform float radius;

#include <fog_pars_vertex>

vec2 circlePos( float angle ){
	
	return vec2(  cos( angle ),  sin( angle ) );

}


#define PI 3.1415926535897

uniform float divisions;

uniform float direction;

vec3 getPos( float offset, float displacement, float r ){

	vec2 cPos = circlePos( displacement * PI * 2.0  ) * r;

	return vec3(cPos.x, 0.0,  cPos.y);
}

float hash13(vec3 p3)
{
	p3  = fract(p3 * .1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
	

	// float seed = hash13( offset  * 100.0);

	// float seed2 = hash13( offset * 100.0 + 100.0);

	// float seed3 = hash13( offset * 100.0 - 100.0);

	// float seed4 = hash13( offset * 20.0 - 50.0) * 10.1416;

	

	// float r = mod(radius * mix( 0.3, 1.0, seed2) - timer, radius);

	float llHeight = lineHeight;

	vUv = uv;

	mat4 m = projectionMatrix * modelViewMatrix;
	

	// float r = mod(seed * radius - timer, radius);
	float r = mod( offset * radius + (timer * direction) + 0.1, radius);

	loopAlpha = sin( PI * (r / radius) );


	// vec3 instancePrevious   =  getPos(offset , vUv.y - divisions, r );

	vec3 instanceStart   	=  getPos(offset , vUv.y, r );

	vec3 instanceEnd        =  getPos(offset , vUv.y + divisions, r );




	vec4 currentProjected = m * vec4( instanceStart, 1.0);

	vec2 currentScreen = currentProjected.xy / currentProjected.w;

	currentScreen.x *= aspect;


	vec4 nextProjected = m * vec4( instanceEnd, 1.0);

	vec2 nextScreen = nextProjected.xy / nextProjected.w;

	nextScreen.x *= aspect;

	vec2 dir = normalize(nextScreen - currentScreen);
	vec2 normal = vec2(-dir.y, dir.x);

	//extrude from center & correct aspect ratio
	normal *= linewidth * 0.5;
	normal.x /= aspect;

	vec4 offset = vec4(normal * sign(position.x), 0.0, 0.0);
	

	gl_Position = currentProjected + offset;

	// vec2 currentScreen = currentProjected.xy / currentProjected.w;

//correct for aspect ratio (screenWidth / screenHeight)
	// currentScreen.x *= aspect;



	// vec4 start 	= modelViewMatrix * vec4( instanceStart, 1.0 );
	
	// vec4 end 	= modelViewMatrix * vec4( instanceEnd, 1.0 );

	// // clip space
	// vec4 clipStart = projectionMatrix * start;
	// vec4 clipEnd = projectionMatrix * end;

	// // ndc space
	// vec2 ndcStart = clipStart.xy / clipStart.w;
	// vec2 ndcEnd = clipEnd.xy / clipEnd.w;

	// // direction
	// vec2 dir = ndcEnd - ndcStart;

	// // account for clip-space aspect ratio
	// dir.x /= invaspect;
	// dir = normalize( dir );

	// vec4 finalPosition = m * vec4(instanceStart, 1.0);

	// // perpendicular to dir
	// //vec4 offset = vec4( dir.y, dir.x, 0.0, 1.0 );

	// vec4 normal = vec4( -dir.y, dir.x, 0., 1. );



    // normal.xy *= .5 * linewidth;
    // normal *= projectionMatrix;
    // if( sizeAttenuation == 0. ) {
    //     normal.xy *= finalPosition.w;
    //     normal.xy /= ( vec4( resolution, 0., 1. ) * projectionMatrix ).xy;
    // }

	

	// finalPosition.xy += normal.xy *  sign( position.x );

	// gl_Position = finalPosition;

	

	vec3 transformed = instanceStart.xyz;

	vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );

	#include <worldpos_vertex>

	#include <fog_vertex>
	  
}   


`;
