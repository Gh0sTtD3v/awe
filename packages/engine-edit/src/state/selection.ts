import { WorldObservable } from "../utils/observable";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import Events from '../editor-events'


export class SelectionObservable extends WorldObservable<Component3D[]> {

    constructor() {

        super(
            [],
            [
                {
                    event: Events.SELECTION_CHANGED,
                    update: (eventData, seed) => {

                        return eventData.selection
                    }
                }
            ],
            true
        )

        window['$selection'] = this
    }
}