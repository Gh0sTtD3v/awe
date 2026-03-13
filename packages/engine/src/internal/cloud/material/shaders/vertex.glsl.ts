export default `
attribute vec3 offset;

attribute vec3 scale;

attribute float aOpacity;

varying float vAlpha;

varying vec2 vUv;

attribute vec4 atlas;

varying vec3 vEye;

#define FADE_DISTANCE_MIN  30.0
#define FADE_DISTANCE_MAX  100.0

#include <fog_pars_vertex>

vec3 billboard(vec3 v, mat4 view, vec3 center, float size, vec3 off) {


	vec3 lookat = (cameraPosition + (vec3(view[0][2], view[1][2], view[2][2])) * 100.0);

    vec3 look = normalize(lookat - center);
    // vec3 look = normalize(cameraPosition - center);
    vec3 cameraUp = vec3(view[0][1], view[1][1], view[2][1]);
    vec3 billboardRight = cross(cameraUp, look);
    vec3 billboardUp = cross(look, billboardRight);
    vec3 pos = off + billboardRight * v.x * size + billboardUp * v.y * size;
    return pos;
}


void main(){

    // vOpacity = aOpacity;
    
    vUv = uv;

    vUv = ( vUv * atlas.xy) + atlas.zw;

    vec3 transformed =   billboard( vec3(  position.xy, 0.0) , viewMatrix, offset, scale.x, offset.xyz );

    vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );

    // float vEye = mvPosition.z;

	float distToCamera = smoothstep(FADE_DISTANCE_MIN ,FADE_DISTANCE_MAX, -mvPosition.z);

    gl_Position = projectionMatrix * mvPosition;

    vAlpha = distToCamera * aOpacity;

    #include <worldpos_vertex>

    #include <fog_vertex>
}

`;
