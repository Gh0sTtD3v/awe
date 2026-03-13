export default `
#ifndef FRESNEL_GLOW

    #define FRESNEL_GLOW

    varying vec3 vFresnelWorldNormal;
    varying vec3 vFresnelWorldPosition;

    uniform float fresnelPower;
    uniform float fresnelIntensity;
    uniform vec3 fresnelColor;
    uniform float fresnelTimer;
    uniform float fresnelSpeed;
    uniform float fresnelPulseAmount;

#endif
`;
