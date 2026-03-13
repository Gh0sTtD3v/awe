export default `
attribute vec3 offset;

attribute vec3 scale;

attribute float rotationY;

varying vec2 vUv;

uniform float timer;

attribute vec4 atlas;

varying vec3 vEye;

varying float vOpacity;

#include <fog_pars_vertex>

vec2 rotate(vec2 v, float a) {
	float s = sin(a);
	float c = cos(a);
	mat2 m = mat2(c, s, -s, c);
	return m * v;
}

vec3 billboard(vec3 v, mat4 view, vec3 center, float size, vec3 off) {


	vec3 lookat = (cameraPosition + (vec3(view[0][2], view[1][2], view[2][2])) * 3000.0);

    vec3 look = normalize(lookat - center);
    // vec3 look = normalize(cameraPosition - center);
    vec3 cameraUp = vec3(view[0][1], view[1][1], view[2][1]);
    vec3 billboardRight = cross(cameraUp, look);
    vec3 billboardUp = cross(look, billboardRight);
    vec3 pos = off + billboardRight * v.x * size + billboardUp * v.y * size;
    return pos;
}


void main(){

    vUv = uv;

    vUv = ( vUv * atlas.xy) + atlas.zw;

    vec2 p = rotate(position.xy, rotationY + timer);

    vec3 transformed =   billboard( vec3(  p, 0.0) , viewMatrix, offset, scale.x, offset.xyz );

    vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );

    gl_Position = projectionMatrix * mvPosition;

    vEye = mvPosition.xyz;

    #include <worldpos_vertex>

    #include <fog_vertex>
}`;
