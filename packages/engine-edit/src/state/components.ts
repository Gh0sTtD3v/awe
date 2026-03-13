import { WorldObservable } from "../utils/observable";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import Events from "../editor-events";

export class ComponentsObservable extends WorldObservable<Component3D[]> {
    constructor() {
        super(
            [],
            [
                {
                    event: Events.COMPONENT_ADDED,
                    update: (eventData, seed) => {
                        return seed.concat(eventData.component);
                    },
                },
                {
                    event: Events.COMPONENT_REMOVED,
                    update: (eventData, seed) => {
                        return seed.filter(
                            (item) => item !== eventData.component
                        );
                    },
                },
            ],
            true
        );
    }
}
