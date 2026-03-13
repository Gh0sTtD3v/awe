export default `
#ifdef RAINBOW

    #ifdef OCCLUSION

        vEye = ( modelViewMatrix * vec4( transformed, 1.0 ) ).xyz;

        rotateAndDissolveNormal = rotateY(rotateAndDissolveTimer) * normal;

    #endif

#endif
`;
