export default `
attribute vec3 offset;

attribute vec3 scale;

attribute float aOpacity;

varying vec2 vUv;

attribute vec4 atlas;

attribute vec4 rotation;

varying vec3 vEye;

varying float vOpacity;

#include <fog_pars_vertex>

attribute float aspectRatioDisplay;

attribute vec3 icolor;

varying vec3 vColor;

vec3 applyQuat( vec4 q, vec3 v ){

    return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
}

// vec4 quat_from_axis_angle(vec3 axis, float angle){

//     float half_angle = (angle * 0.5);

//     return vec4( axis * sin(half_angle) , cos(half_angle));
// }

  
// vec4 quat_mult(vec4 q1, vec4 q2){ 
  
//     return vec4(
//      q2.xyz * q1.w + q1.xyz * q2.w + cross(q1.xyz, q2.xyz),
//      q1.w * q2.w - dot(q1.xyz, q2.xyz)
//  );
// }
 


mat3 rotateY(float rad) {
    float c = cos(rad);
    float s = sin(rad);
    return mat3(
        c, 0.0, -s,
        0.0, 1.0, 0.0,
        s, 0.0, c
    );
}

vec3 getPosition(){

    vec4 quat = rotation;

    vec3 pos = position;

    return applyQuat ( quat, ( pos * scale )) + offset;

}

void main(){

    vColor = icolor;

    vOpacity = aOpacity;

    vUv   = atlas.xy + atlas.zw * uv;
    
    vUv.y = 1.0 - vUv.y;
    
    vec3 position = position;

    position.x *= aspectRatioDisplay;

    position.y *= -1.0;

    vec3 transformed =   getPosition();

    vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );

    gl_Position = projectionMatrix * mvPosition;

    vEye = mvPosition.xyz;

    #include <worldpos_vertex>

    #include <fog_vertex>
}`;
