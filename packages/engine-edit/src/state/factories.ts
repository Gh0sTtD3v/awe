import { WorldObservable } from "../utils/observable";
import Events from "../editor-events";
import type { ComponentFactory } from "@oncyberio/engine/space/abstract/component-factory";

export class FactoriesObservable extends WorldObservable<
    (typeof ComponentFactory)[]
> {
    constructor() {
        super(
            [],
            [
                {
                    event: Events.COMPONENT_FACTORY_INIT,
                    update: (eventData, seed) => {
                        return Object.values(eventData.factoryClasses);
                    },
                },
                {
                    event: Events.COMPONENT_FACTORY_ADDED,
                    update: (eventData, seed) => {
                        return seed.concat(eventData.factoryClass);
                    },
                },
                {
                    event: Events.COMPONENT_FACTORY_REMOVED,
                    update: (eventData, seed) => {
                        return seed.filter(
                            (item) => item !== eventData.factoryClass
                        );
                    },
                },
            ],
            true
        );

        window["$components"] = this;
    }
}
