import System from './system';

export class AtlasFactory {
    constructor() {
        this.atlas = null;
    }

    get(opts) {
        return new System(opts);
    }
}

