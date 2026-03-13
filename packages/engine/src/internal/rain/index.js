import Rain from './rain';

class RainFactory {
    constructor() {}

    get(opts) {
        return new Rain(opts);
    }
}

export default new RainFactory();
