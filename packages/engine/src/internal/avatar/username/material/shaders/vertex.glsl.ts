export default `
attribute vec3 offset;

attribute vec4 atlas;

varying vec2 vUv;

varying vec3 vNormal;


attribute float paused;

varying float vPaused;

varying vec3 direction;

attribute float opacity;

varying float vOpacity;

varying float close;


vec3 billboard(vec3 v, mat4 view, vec3 center, float size, vec3 off) {

    
    vec3 lookat = cameraPosition + (vec3(view[0][2], view[1][2], view[2][2])) * 1500.0;

    vec3 look = normalize(lookat - center);
    // vec3 look = normalize(cameraPosition - center);
    vec3 cameraUp = vec3(view[0][1], view[1][1], view[2][1]);
    vec3 billboardRight = cross(cameraUp, look);
    vec3 billboardUp = cross(look, billboardRight);
    vec3 pos = off + billboardRight * v.x * size + billboardUp * v.y * size;
    return pos;
}


void main() {

    vOpacity = opacity;

    vUv = ( uv * atlas.xy) + atlas.zw;

    vec3 finalP = billboard( vec3(  position.xy, 0.0) , viewMatrix, offset.xyz , 0.75, offset.xyz);

    close = smoothstep(2.0, 5.5, distance( cameraPosition.xyz , ( modelMatrix * vec4(finalP, 1.0) ).xyz  ));

	gl_Position = projectionMatrix * modelViewMatrix * vec4( finalP , 1.0 );
}
`;
