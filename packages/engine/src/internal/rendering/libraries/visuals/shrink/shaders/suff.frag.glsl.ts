export default `
#ifdef SHRINK

    #ifndef SHADOW 

        #ifdef INSTANCE 

             gl_FragColor.rgb = mix( vec3(1.0, 0.0, 0.0), gl_FragColor.rgb, vShrinkAmount);

        #endif
    #endif
#endif`;
