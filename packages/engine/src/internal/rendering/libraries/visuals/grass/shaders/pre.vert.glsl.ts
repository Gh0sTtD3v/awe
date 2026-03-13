export default `
uniform     float grassSpeed;

// attribute   vec3 offset;

// attribute   float rotationY;

// attribute   vec4 rotation;

// attribute   vec3 scale;

float rando(vec2 n) { 
	return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}


float noise(vec2 p){
	vec2 ip = floor(p);
	vec2 u = fract(p);
	u = u*u*(3.0-2.0*u);
	
	float res = mix(
		mix(rando(ip),rando(ip+vec2(1.0,0.0)),u.x),
		mix(rando(ip+vec2(0.0,1.0)),rando(ip+vec2(1.0,1.0)),u.x),u.y);
	return res*res;
}



#ifdef USE_INSTANCE_COLOR

    #define USE_COLOR 

    attribute vec3 icolor;

#endif

#define OVERRIDE_PLUGIN_VERTEX`;
