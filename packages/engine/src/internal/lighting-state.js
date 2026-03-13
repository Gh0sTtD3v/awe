import emitter from './engine-emitter'
import { EngineEvents } from './engine-events'

export var CURRENT_LIGHTING_STATE = null

export function SET_LIGHTING_STATE( STATE ) {

    if( STATE != CURRENT_LIGHTING_STATE ){

        CURRENT_LIGHTING_STATE = STATE

        emitter.emit(EngineEvents.LIGHTING, CURRENT_LIGHTING_STATE );
        
    }

}