export default `
#ifdef DISSOLVE_EDGE

    float dissolveY = vDissolveWorldPos.y;

    if (dissolveY < dissolveThreshold) discard;

    #ifndef SHADOW
        float edgeDist = dissolveY - dissolveThreshold;
        float edgeGlow = 1.0 - smoothstep(0.0, dissolveEdgeWidth, edgeDist);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, dissolveEdgeColor, edgeGlow);
        gl_FragColor.rgb += dissolveEdgeColor * edgeGlow * 1.5;
    #endif

#endif
`;
