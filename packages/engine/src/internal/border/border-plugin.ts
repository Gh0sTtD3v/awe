export function BorderPlugin() {
    const VertexPre = `
        varying float front;
        attribute float borderSize;
       

        #define USE_INSTANCE_COLOR 1.0


        attribute vec3 color;

        vec3 rgb2hsb( in vec3 c ){
            vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
            vec4 p = mix(vec4(c.bg, K.wz),
                        vec4(c.gb, K.xy),
                        step(c.b, c.g));
            vec4 q = mix(vec4(p.xyw, c.r),
                        vec4(c.r, p.yzx),
                        step(p.x, c.r));
            float d = q.x - min(q.w, q.y);
            float e = 1.0e-10;
            return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)),
                        d / (q.x + e),
                        q.x);
        }

        vec3 hsb2rgb( in vec3 c ){
            vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),
                                    6.0)-3.0)-1.0,
                            0.0,
                            1.0 );
            rgb = rgb*rgb*(3.0-2.0*rgb);
            return c.z * mix(vec3(1.0), rgb, c.y);
        }
        `;

    const VertexMain = `

        #ifdef USE_INSTANCE_COLOR

            vColor = icolor;

        #endif

        front = step(0.1, normal.z);

        float back = 1.0 - step(-0.1, normal.z);

        float side = 1.0 - min(1.0, front + back);
    `;
    const VertexSuff = `
      

        vec3 hsb = rgb2hsb(icolor);

        if(hsb.z < 0.05) {

            hsb.z = hsb.z + (1.0 - side) * 0.05;
        }
        else {

            hsb.z = hsb.z - hsb.z * side * 0.1;
        }

        vColor = hsb2rgb(hsb);

       vOpacity = aOpacity * (1.0 - (step(borderSize, 0.0) * front));   
    `;

    const FragmentPre = `
        #define USE_COLOR
    `;

    return {
        name: "BorderPlugin",

        transparent: true,

        attributes: {
            borderSize: {
                name: "borderSize",
                array: [],
                length: 1,
                defaultValue: 1,
            },
        },

        fragmentShaderHooks: {
            prefix: FragmentPre,
        },

        vertexShaderHooks: {
            prefix: VertexPre,
            main: VertexMain,
            suffix: VertexSuff,
        },
    };
}
