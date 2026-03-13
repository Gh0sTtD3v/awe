export default `
#ifdef RAINBOW
    #ifdef OCCLUSION

        float rimPower = 1.0;

        float f = rimPower * abs( dot( rainbowNormal, normalize( vEye ) ) );
        f = ( 1. - smoothstep( 0.0, 1., f ) ) * rainbowAmount;

        // f *= (sin(rainbowSpeed * rainbowTimer * 3.0) + 1.0) * 0.5;

        gl_FragColor = vec4(f, f, f, 1.0);

    #endif

    gl_FragColor.rgb = mix( gl_FragColor.rgb, hue_shift(gl_FragColor.rgb, rainbowTimer * rainbowSpeed ),  rainbowAmount );

#endif`;
