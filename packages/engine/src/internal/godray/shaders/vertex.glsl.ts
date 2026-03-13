export default `
attribute   vec3 icolor;

attribute   vec3 offset;

attribute   vec3 scale;

attribute   vec4 rotation;

attribute   float aOpacity;

varying     vec2 vUv;

varying     vec3 vNormal;

varying     vec3 vEye;

varying     float vOpacity;

#include <fog_pars_vertex>

#define INSTANCE



vec3 applyQuat( vec4 q, vec3 v ){

    return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
}
 

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

    #ifndef INSTANCE

       return position;

    #endif

    vec4 quat = rotation;

    vec3 pos = position;

    #ifdef ROTATING

        pos = rotateY(timer)  * pos;

    #endif

    return applyQuat ( quat, ( pos * scale )) + offset;

}


vec3 getNormal(){

    #ifndef INSTANCE

       return normal;

    #endif

    vec4 quat = rotation;

    vec3 pos = normal;

    #ifdef ROTATING

        pos = rotateY(timer)  * pos;

    #endif

    return applyQuat ( quat, ( pos * scale ));

}


void main(){

    vOpacity = aOpacity;

    vUv = uv;

    vec3 normal = getNormal();

    vNormal =  normalize(normalMatrix * normal);

    vec3 transformed = getPosition();

    vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0);

    gl_Position = projectionMatrix * mvPosition;

    vEye = mvPosition.xyz;

    #include <worldpos_vertex>

    #include <fog_vertex>
}`;
