export default `
#ifndef DISSOLVE

    #define DISSOLVE

    varying vec3  effectOrigin;
    varying vec3  DissolveWorldPosition;
    uniform float dissolveTimer;

    #ifdef INSTANCE

        attribute float dissolveDistance;

        varying float vDissolveDistance;

    #endif

#endif

`;
