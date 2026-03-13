export default `
#ifndef ROTATE_AND_DISSOLVE

    #define ROTATE_AND_DISSOLVE

    varying vec3 vEye;
    varying vec3 rotateAndDissolveNormal;
    uniform float rotateAndDissolveTimer;
   

#endif

#ifndef INSTANCE 

    uniform float rotateAndDissolveAmount;

    mat3 rotateY( float rad ) {
        float c = cos(rad);
        float s = sin(rad);
        return mat3(
            c, 0.0, -s,
            0.0, 1.0, 0.0,
            s, 0.0, c
        );
    }

    vec3 getNormal(mat3 rotatemat, vec3 norm ){

        return rotatemat * norm;
    }

#else

    #define OVERRIDE_PLUGIN_VERTEX 1

    attribute float rotateAndDissolveAmount;

#endif

`;
