export default `
float hash(float p) { p = fract(p * 0.011); p *= p + 7.5; p *= p + p; return fract(p); }
float hash(vec2 p) {vec3 p3 = fract(vec3(p.xyx) * 0.13); p3 += dot(p3, p3.yzx + 3.333); return fract((p3.x + p3.y) * p3.z); }
float noise1D(vec3 coord) {
    float x = (coord.x + coord.y) + coord.z * 50.0;
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u);
    // return x;
}

#include <fog_pars_fragment>


#define FADE_DISTANCE_MIN 30.0
#define FADE_DISTANCE_MAX 40.0

uniform     float timer;

varying     float vOpacity;

varying     vec3 vNormal;

varying     vec3 vEye;

varying     vec2 vUv;

void main(){


    vec4 final = vec4(1., 1., 1., 1.);

    float distToCamera = smoothstep(FADE_DISTANCE_MIN ,FADE_DISTANCE_MAX, -vEye.z);

    float rim = 0.8 * abs( dot( vNormal, normalize( vEye ) ) );

    rim = smoothstep( 0.0, 1., rim );

    final.a =  rim * vOpacity;

    // vec3 x = vec3(vUv.y * 4.0 + timer * 0.01);
    vec3 x = vec3(vUv.y * 4.0 + timer * 0.05);
     x.y -= timer;
    float noise = noise1D(x);
    final.a = mix( 0.0, 1.5, final.a * smoothstep(0.1, 1.0, sin( 3.1416 * vUv.x )) * mix(0.9, 1., noise) * distToCamera);
    
    gl_FragColor = final;

    #include <colorspace_fragment>

    #include <fog_fragment>
}

`;
