export default `
varying vec3 vEye;


#include <fog_pars_vertex>

vec2 rotate(vec2 v, float a) {
	float s = sin(a);
	float c = cos(a);
	mat2 m = mat2(c, s, -s, c);
	return m * v;
}

//  vec3 billboardX(vec3 v, mat4 view, vec3 center, vec3 size) {
//     vec3 look = cameraPosition + (vec3(view[0][2], view[1][2], view[2][2])) * 3000.0;
//     look.y = 0.0;
//     look = normalize(look);

//     vec3 billboardUp = vec3(0., 1., 0.);
//     vec3 billboardRight = cross(billboardUp, look);
//     vec3 pos = center + billboardRight * v.x * size.x + billboardUp * v.y * size.y;
//     return pos;
// }

vec3 billboard(vec3 v, mat4 view, vec3 center, vec2 scale, vec3 off) {

    vec3 camView = vec3(view[0][2], view[1][2], view[2][2]);
	vec3 lookat = (cameraPosition + (camView) * 3000.0);

    vec3 look = normalize(lookat - center);
    // vec3 look = normalize(cameraPosition - center);
    vec3 cameraUp = vec3(view[0][1], view[1][1], view[2][1]);
    vec3 billboardRight = cross(cameraUp, look);
    vec3 billboardUp = cross(look, billboardRight);
    vec3 pos = billboardRight * v.x * scale.x + billboardUp * v.y * scale.y;

    pos -= camView * 0.1;
    return pos;
}


void main(){

    vec3 transformed = position;
    vec2 scale = vec2(0.0);

    scale.x = length(modelMatrix[0]);
    scale.y = length(modelMatrix[1]);

    vec3 center = modelMatrix[3].xyz;

    transformed.xyz =  billboard( transformed.xyz , viewMatrix, center, vec2(1.0), center );

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;


    #include <worldpos_vertex>

    #include <fog_vertex>
}`;
