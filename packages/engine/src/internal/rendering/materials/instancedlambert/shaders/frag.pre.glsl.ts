import uvshift from '../../common/uvshift.glsl.ts';

export default `
${uvshift}

#ifdef USE_ATTRIBUTE_OPACITY

    varying float vOpacity;

#endif`;
