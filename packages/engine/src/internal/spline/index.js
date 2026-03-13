import SplineObject from './spline-object'

export class SplineFactory {

    constructor(){
        
        this.instances = []
    }

    get( space, data ){ 

        const splineObject = new SplineObject( data )

        return splineObject
    }

    disposeAll(){


    }
}