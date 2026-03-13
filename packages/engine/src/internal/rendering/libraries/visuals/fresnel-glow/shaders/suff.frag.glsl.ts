export default `
#ifdef FRESNEL_GLOW

    vec3 fresnelViewDir = normalize(cameraPosition - vFresnelWorldPosition);
    float fresnelDot = abs(dot(fresnelViewDir, normalize(vFresnelWorldNormal)));
    float fresnelFactor = pow(1.0 - fresnelDot, fresnelPower);
    float fresnelPulse = mix(1.0, 0.8 + 0.2 * sin(fresnelTimer * fresnelSpeed), fresnelPulseAmount);
    gl_FragColor.rgb += fresnelColor * fresnelFactor * fresnelIntensity * fresnelPulse;

#endif
`;
