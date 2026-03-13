import LightingWrapper from './wrapper';

class Lighting {
    constructor() {}

    get(opts, scene) {
        return new LightingWrapper(opts, scene);
    }
}

export default new Lighting();
