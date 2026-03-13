import transformposition from '../../common/transformposition.glsl.ts';

export default `
attribute   vec3 offset;

attribute   float rotationY;

attribute   vec4 rotation;

attribute   vec3 scale;

${transformposition}
`;
