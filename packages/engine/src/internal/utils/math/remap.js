import Smoothstep from './smoothstep';

import Mix from './mix';

const Remap = function remap(inMin, inMax, outMin, outMax, value) {
    return Mix(outMin, outMax, Smoothstep(inMin, inMax, value));
};

export default Remap;
