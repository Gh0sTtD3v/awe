export default `
#ifndef RAINBOW

    #define RAINBOW

    varying vec3 vEye;
    varying vec3 rainbowNormal;
    uniform float rainbowTimer;

#endif

#ifndef INSTANCE 


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

#endif 

`;
