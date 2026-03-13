export default `
#ifdef OVERRIDE_PLUGIN_VERTEX

    vec3 originalPosition       =  position;

    vec3 position               =  getPosition();

    position.x -= ( noise(position.xy * 0.02 + grassSpeed * 2.0 ) - 0.5) *  smoothstep(0.0, 1.0, uv.y) * 2.0;

    vec3 normal  	            = getNormal();

#endif
`;
