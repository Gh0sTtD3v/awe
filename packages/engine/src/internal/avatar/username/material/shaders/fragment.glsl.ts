export default `
uniform sampler2D tInput;

varying vec2 vUv;

// varying float vSpeak;

// varying float vPaused;

varying float vOpacity;

varying float close;



void main() {

   // float speak = uSpeaking * ((sin(uTime * 10.0) + 1.0) * 0.5);
   // float speak = uSpeaking;


   gl_FragColor = texture2D(tInput, vUv);

   #ifdef OCCLUSION

   		gl_FragColor.rgb = vec3(0.0);

   #endif

   gl_FragColor.a *= vOpacity * close;

   if( gl_FragColor.a < 0.5 ) {

   	discard;
   }

   // gl_FragColor = vec4(vPaused, vPaused, vPaused, 1.0);
   // gl_FragColor.rgb = texture2D(tInput, vUv).rgb;

}
`;
