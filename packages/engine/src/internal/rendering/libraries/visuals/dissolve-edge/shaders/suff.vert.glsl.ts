export default `
#ifdef DISSOLVE_EDGE

    vDissolveWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;

#endif
`;
