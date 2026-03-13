import Wave from './wave';

const DEFAULT_DATA = {
    height: 0.5,
    radius: 5,
    linewidth: 0.14,
    divisions: 100,
    position: {
        x: 0,
        y: 0,
        z: 0,
    },
    rotation: {
        x: 0,
        y: 0,
        z: 0,
    },
    lines : 4,
    direction: -1,
    target: null
};

// import Wrapper from './wrapper'

export class WaveFactory {
    constructor() {}

    get(opts) {

        const data = Object.assign(DEFAULT_DATA, opts);

        const wind = new Wave(data);

        // wind.renderOrder = 100;

        if (data.position) {
            wind.position.set(
                data.position.x,
                data.position.y,
                data.position.z,
            );
        }

        if (data.rotation) {
            wind.rotation.set(
                data.rotation.x,
                data.rotation.y,
                data.rotation.z,
            );
        }

        return wind; // new Wrapper( wind, data );
    }
}

