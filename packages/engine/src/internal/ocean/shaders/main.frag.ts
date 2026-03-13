export default `
#ifdef USE_MAP

    vec2 vMapUv = mod( vec2( vMapUv.x , vMapUv.y ) * repeat + vec2(sin(timer + vMapUv.y * 10.0), 0.0), vec2(1.0));


#endif`;
