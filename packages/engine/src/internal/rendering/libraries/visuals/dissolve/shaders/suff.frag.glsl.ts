export default `
#ifdef DISSOLVE 

    #ifdef INSTANCE

        float _dissolveDistance = vDissolveDistance;
    #else

        float _dissolveDistance = dissolveDistance;

    #endif

    float noise = dissolveNoise( DissolveWorldPosition + vec3(0.0, 0.0, dissolveTimer));
    float distancefromEffectOrigin = distance(DissolveWorldPosition, effectOrigin) * 8.0;
    float falloff     = step(_dissolveDistance, distancefromEffectOrigin - noise);
    float glowFalloff = step(_dissolveDistance + 0.15, distancefromEffectOrigin - noise);

    vec3 glowColor = vec3(0.2667, 0.8745, 0.6);
    #ifdef OCCLUSION
        glowColor *= 2.0;
    #endif
        
        // gl_FragColor.rgb = mix(  vec3(1.0, 0.0, 0.0),gl_FragColor.rgb, falloff );

    gl_FragColor.rgb = mix(glowColor.rgb, gl_FragColor.rgb, glowFalloff);
    // #else

    gl_FragColor.a = falloff;

    if( falloff < 0.1){

        discard;
    }

#endif

`;
