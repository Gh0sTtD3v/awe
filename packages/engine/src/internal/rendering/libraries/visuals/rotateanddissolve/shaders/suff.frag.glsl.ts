export default `
#ifdef ROTATE_AND_DISSOLVE

    #ifndef SHADOW 

        #ifdef OCCLUSION

            float rimPower = 1.0;

            float f = rimPower * abs( dot( rotateAndDissolveNormal, normalize( vEye ) ) );
            f = ( 1. - smoothstep( 0.0, 1., f ) );

            // f *= (sin(rotateAndDissolveSpeed * rotateAndDissolveTimer * 3.0) + 1.0) * 0.5;

            gl_FragColor = vec4(f, f, f, 1.0);

        #endif

        gl_FragColor.rgb = hue_shift(gl_FragColor.rgb, rotateAndDissolveTimer * rotateAndDissolveSpeed );

    #endif

#endif`;
