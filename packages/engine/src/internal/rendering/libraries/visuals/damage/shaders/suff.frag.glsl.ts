export default `
#ifdef DAMAGE

    vec3 damageColor = mix( vec3(1.0, 0.0, 0.0), gl_FragColor.rgb, (sin(DamageTimer * DamageSpeed) + 1.0) * 0.5);

    gl_FragColor.rgb =  mix( gl_FragColor.rgb, damageColor,  DamageAmount );

#endif`;
