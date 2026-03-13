export default `
#ifdef DISSOLVE

    effectOrigin = vec3(0.0, 0.0, 0.0);

    #ifdef INSTANCE

        DissolveWorldPosition= (vec4( originalPosition, 1.0 )).xyz;

    #else  

        DissolveWorldPosition= (vec4( position, 1.0 )).xyz;

    #endif

    #ifdef OCCLUSION

    #endif

    #ifdef INSTANCE   

        vDissolveDistance =  dissolveDistance;

    #endif

#endif

`;
