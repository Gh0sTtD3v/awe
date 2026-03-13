import uvshift from '../../common/uvshift.glsl.ts';

export default `
${uvshift}

varying vec3 ghostVnormal;
varying vec3 ghostvEye;

uniform float rimPower;

uniform float minAlpha;`;
