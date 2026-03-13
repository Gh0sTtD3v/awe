export default `
#ifdef PULSE_EFFECT

    float pulseFactor = 0.5 + 0.5 * sin(pulseTimer * pulseSpeed);
    gl_FragColor.rgb += pulseColor * pulseFactor * pulseIntensity;

#endif
`;
