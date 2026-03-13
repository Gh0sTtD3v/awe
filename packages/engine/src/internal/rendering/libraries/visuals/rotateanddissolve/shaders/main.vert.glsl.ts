export default `

#ifdef OVERRIDE_PLUGIN_VERTEX

    vec3 originalPosition       =  position;

    vec3 position               =  getPositionWithOptions( position, scale * rotateAndDissolveAmount, rotation, offset, rotateAndDissolveTimer + rotateAndDissolveAmount * 5.0 );

    #ifndef SHADOW

        vec3 normal  	            =  getPositionWithOptions( normal, vec3(1.0), rotation, vec3(0.0), rotateAndDissolveTimer );

    #endif

#endif

`;
