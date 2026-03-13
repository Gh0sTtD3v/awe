export default `
#ifdef HOLOGRAM_EFFECT

    vHologramWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;

#endif
`;
