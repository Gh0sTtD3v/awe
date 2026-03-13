export default `
#ifndef HOLOGRAM_EFFECT

    #define HOLOGRAM_EFFECT

    varying vec3 vHologramWorldPos;

    uniform vec3 hologramColor;
    uniform float hologramScanDensity;
    uniform float hologramScanSpeed;
    uniform float hologramFlickerStrength;
    uniform float hologramTimer;

#endif
`;
