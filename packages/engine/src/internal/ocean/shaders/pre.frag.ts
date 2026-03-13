export default `
uniform float repeat;
uniform float timer;


// Procedural texture generation for the water
vec4 getWater(sampler2D map,  vec2 uv )
{   
    vec4 base = texture2D (map, mod( uv * repeat +  vec2(sin(timer * 0.1 + uv.y * 10.0), 0.0) * 0.3, vec2(1.0))) * vec4(0.5, 0.5, 1.0, 1.0);

    vec4 blend = texture2D (map,  mod( (uv) * repeat * 0.5 + vec2(0.0, sin(-timer * 0.1 + uv.x * 10.0)) * 0.3, vec2(1.0))) ;

    vec4 temp       = (1.0 - ((1.0 - base) * (1.0 - blend)));

    return temp;
}
`;
