export default `
#ifndef SHRINK

    #define SHRINK

    varying vec3 vEye;
    varying vec3 shrinkNormal;
    uniform float shrinkTimer;

    #ifdef INSTANCE
        attribute float shrinkAmount;
        varying float vShrinkAmount;
    #endif

#endif


`;
