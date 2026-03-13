export default `
#ifdef USE_FOG

    vFogDepth = -mvPosition.z;

    #ifdef USE_SPRITE
        vFogPosition = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    #else
        vec4 fogWorldPosition = vec4(transformed, 1.0);

        #ifdef USE_BATCHING
            fogWorldPosition = batchingMatrix * fogWorldPosition;
        #endif

        #ifdef USE_INSTANCING
            fogWorldPosition = instanceMatrix * fogWorldPosition;
        #endif

        fogWorldPosition = modelMatrix * fogWorldPosition;
        vFogPosition = fogWorldPosition.xyz;
    #endif

#endif
`;
