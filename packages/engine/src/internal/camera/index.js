import PerspectiveCamera from './perspective'

export class CameraFactory  {

    constructor() {

    }

    get( parent, opts ){

        return new PerspectiveCamera( parent, opts )
    }
}