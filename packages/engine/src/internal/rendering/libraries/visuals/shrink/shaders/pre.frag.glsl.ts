export default `
#ifndef SHRINK

    #define SHRINK

    varying vec3 vEye;
    varying vec3 shrinkNormal;
    
    uniform float shrinkSpeed;
    uniform float shrinkTimer;


    vec3 hue_shift(vec3 color, float dhue) {
	float s = sin(dhue);
	float c = cos(dhue);
        return (color * c) + (color * s) * mat3(
            vec3(0.167444, 0.329213, -0.496657),
            vec3(-0.327948, 0.035669, 0.292279),
            vec3(1.250268, -1.047561, -0.202707)
        ) + dot(vec3(0.299, 0.587, 0.114), color) * (1.0 - c);
    }

    #ifdef INSTANCE

       varying float vShrinkAmount;

    #endif


#endif`;
