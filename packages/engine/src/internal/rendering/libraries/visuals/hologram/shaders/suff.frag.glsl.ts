export default `
#ifdef HOLOGRAM_EFFECT

    float scanline = sin(vHologramWorldPos.y * hologramScanDensity + hologramTimer * hologramScanSpeed) * 0.5 + 0.5;
    float flicker = 1.0 - hologramFlickerStrength + hologramFlickerStrength * sin(hologramTimer * 30.0);
    gl_FragColor.rgb = hologramColor * (0.5 + 0.5 * scanline) * flicker;
    gl_FragColor.a = (0.3 + 0.4 * scanline) * flicker;

#endif
`;
