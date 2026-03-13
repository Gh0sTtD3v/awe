export default `
#ifdef USE_FOG

    uniform vec3 fogColor;
    varying float vFogDepth;
    uniform vec3 fogFadeColor;
    uniform sampler2D fogTexture;
    uniform float fogTextureEnabled;
    uniform vec3 fogTextureCubeUVSize;
    varying vec3 vFogPosition;

    #define fogCubeUVMinMipLevel 4.0
    #define fogCubeUVMinTileSize 16.0

    float getFogFace(vec3 direction) {
        vec3 absDirection = abs(direction);
        float face = -1.0;

        if (absDirection.x > absDirection.z) {
            if (absDirection.x > absDirection.y) {
                face = direction.x > 0.0 ? 0.0 : 3.0;
            } else {
                face = direction.y > 0.0 ? 1.0 : 4.0;
            }
        } else {
            if (absDirection.z > absDirection.y) {
                face = direction.z > 0.0 ? 2.0 : 5.0;
            } else {
                face = direction.y > 0.0 ? 1.0 : 4.0;
            }
        }

        return face;
    }

    vec2 getFogUV(vec3 direction, float face) {
        vec2 uv;

        if (face == 0.0) {
            uv = vec2(direction.z, direction.y) / abs(direction.x);
        } else if (face == 1.0) {
            uv = vec2(-direction.x, -direction.z) / abs(direction.y);
        } else if (face == 2.0) {
            uv = vec2(-direction.x, direction.y) / abs(direction.z);
        } else if (face == 3.0) {
            uv = vec2(-direction.z, direction.y) / abs(direction.x);
        } else if (face == 4.0) {
            uv = vec2(-direction.x, direction.z) / abs(direction.y);
        } else {
            uv = vec2(direction.x, direction.y) / abs(direction.z);
        }

        return 0.5 * (uv + 1.0);
    }

    vec3 fogBilinearCubeUV(sampler2D envMap, vec3 direction, float mipInt) {
        float face = getFogFace(direction);

        float filterInt = max(fogCubeUVMinMipLevel - mipInt, 0.0);
        mipInt = max(mipInt, fogCubeUVMinMipLevel);

        float faceSize = exp2(mipInt);
        vec2 uv = getFogUV(direction, face) * (faceSize - 2.0) + 1.0;

        if (face > 2.0) {
            uv.y += faceSize;
            face -= 3.0;
        }

        uv.x += face * faceSize;
        uv.x += filterInt * 3.0 * fogCubeUVMinTileSize;
        uv.y += 4.0 * (exp2(fogTextureCubeUVSize.z) - faceSize);

        uv.x *= fogTextureCubeUVSize.x;
        uv.y *= fogTextureCubeUVSize.y;

        #ifdef texture2DGradEXT
            return texture2DGradEXT(envMap, uv, vec2(0.0), vec2(0.0)).rgb;
        #else
            return texture2D(envMap, uv).rgb;
        #endif
    }

    #define fogCubeUVR0 1.0
    #define fogCubeUVM0 -2.0
    #define fogCubeUVR1 0.8
    #define fogCubeUVM1 -1.0
    #define fogCubeUVR4 0.4
    #define fogCubeUVM4 2.0
    #define fogCubeUVR5 0.305
    #define fogCubeUVM5 3.0
    #define fogCubeUVR6 0.21
    #define fogCubeUVM6 4.0

    float fogRoughnessToMip(float roughness) {
        float mip = 0.0;

        if (roughness >= fogCubeUVR1) {
            mip = (fogCubeUVR0 - roughness) * (fogCubeUVM1 - fogCubeUVM0) / (fogCubeUVR0 - fogCubeUVR1) + fogCubeUVM0;
        } else if (roughness >= fogCubeUVR4) {
            mip = (fogCubeUVR1 - roughness) * (fogCubeUVM4 - fogCubeUVM1) / (fogCubeUVR1 - fogCubeUVR4) + fogCubeUVM1;
        } else if (roughness >= fogCubeUVR5) {
            mip = (fogCubeUVR4 - roughness) * (fogCubeUVM5 - fogCubeUVM4) / (fogCubeUVR4 - fogCubeUVR5) + fogCubeUVM4;
        } else if (roughness >= fogCubeUVR6) {
            mip = (fogCubeUVR5 - roughness) * (fogCubeUVM6 - fogCubeUVM5) / (fogCubeUVR5 - fogCubeUVR6) + fogCubeUVM5;
        } else {
            mip = -2.0 * log2(1.16 * roughness);
        }

        return mip;
    }

    vec4 fogTextureCubeUV(sampler2D envMap, vec3 sampleDir, float roughness) {
        float mip = clamp(fogRoughnessToMip(roughness), fogCubeUVM0, fogTextureCubeUVSize.z);
        float mipF = fract(mip);
        float mipInt = floor(mip);

        vec3 color0 = fogBilinearCubeUV(envMap, sampleDir, mipInt);

        if (mipF == 0.0) {
            return vec4(color0, 1.0);
        }

        vec3 color1 = fogBilinearCubeUV(envMap, sampleDir, mipInt + 1.0);
        return vec4(mix(color0, color1, mipF), 1.0);
    }

    #ifdef FOG_EXP2

        uniform float fogDensity;

    #else

        uniform float fogNear;
        uniform float fogFar;

    #endif

#endif
`;
