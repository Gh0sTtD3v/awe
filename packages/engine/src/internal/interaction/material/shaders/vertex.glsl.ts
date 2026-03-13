export default `
attribute vec3 offset;

attribute vec3 scale;

attribute float aOpacity;

attribute float aspectRatioDisplay;

varying vec2 vUv;

attribute vec4 atlas;

attribute vec3 icolor;

varying vec3 vColor;


varying vec3 vEye;

varying float vOpacity;

#include <fog_pars_vertex>

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

    vColor = icolor;

    vOpacity = aOpacity;

    vUv   = atlas.xy + atlas.zw * uv;
    
    vUv.y = 1.0 - vUv.y;
    
    vec3 position = position;

    position.x *= aspectRatioDisplay;

    position.y *= -1.0;

    vec3 transformed =   billboard( vec3(  position.xy, 0.0) , viewMatrix, offset, scale.x, offset.xyz );

    vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );

    gl_Position = projectionMatrix * mvPosition;

    vEye = mvPosition.xyz;

    #include <worldpos_vertex>

    #include <fog_vertex>
}`;
