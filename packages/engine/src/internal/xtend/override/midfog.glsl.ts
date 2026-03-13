export default `
#ifdef USE_FOG

    #ifdef FOG_EXP2

        float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );

    #else

        float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );

    #endif

    fogFactor = clamp(fogFactor, 0.0, 1.0);

    // Slightly front-load fog response so distant geometry blends earlier.
    float shapedFogFactor = pow(fogFactor, 0.9);

    vec3 closeColor = gl_FragColor.rgb;
    vec3 midColor = fogFadeColor;
    vec3 farColor = fogColor;

    vec3 fogView = cameraPosition.xyz - vFogPosition.xyz;
    float fogViewLen = max(length(fogView), 0.0001);
    vec3 viewDir = fogView / fogViewLen;

    // Add a small horizon + ground-height haze boost for more natural distance blending.
    float horizon = clamp(1.0 - abs(viewDir.y), 0.0, 1.0);
    float horizonBoost = smoothstep(0.35, 1.0, horizon) * 0.20;
    float heightBoost = smoothstep(-5.0, 60.0, cameraPosition.y - vFogPosition.y) * 0.18;

    float boostedFogFactor = clamp(
        shapedFogFactor + (horizonBoost + heightBoost) * shapedFogFactor,
        0.0,
        1.0
    );

    if (fogTextureEnabled > 0.5) {
        vec3 p = fogView / fogViewLen;
        farColor = fogTextureCubeUV(fogTexture, -p, 0.0).rgb;
        farColor = linearToOutputTexel(vec4(farColor, 1.0)).rgb;

        // On textured backgrounds, pull mid-fog toward sampled far color to avoid flat color bands.
        vec3 textureMidColor = mix(fogFadeColor, farColor, 0.45);
        float textureMidInfluence = smoothstep(0.2, 0.7, boostedFogFactor);
        midColor = mix(fogFadeColor, textureMidColor, textureMidInfluence);
    }

    float midFogFactor = smoothstep(0.0, 0.72, boostedFogFactor);

    vec3 blendedColor = mix(closeColor, midColor, midFogFactor);
    blendedColor = mix(blendedColor, farColor, boostedFogFactor);

    // Subtle atmospheric desaturation with distance.
    float luma = dot(blendedColor, vec3(0.299, 0.587, 0.114));
    float desaturation = boostedFogFactor * 0.20;
    blendedColor = mix(blendedColor, vec3(luma), desaturation);

    gl_FragColor.rgb = blendedColor;

#endif`;
