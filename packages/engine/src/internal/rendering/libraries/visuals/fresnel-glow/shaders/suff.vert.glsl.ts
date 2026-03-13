export default `
#ifdef FRESNEL_GLOW

    vFresnelWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vFresnelWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;

#endif
`;
