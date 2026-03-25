import { WorldObservable } from "../utils/observable";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import Events from "../editor-events";

export interface EnabledToolsState {
    drawer: boolean;
    gridViewer: boolean;
}

export class EnabledToolsStateObservable extends WorldObservable<EnabledToolsState> {
    constructor() {
        super(
            {
                drawer: false,
                gridViewer: false,
            },
            [
                {
                    event: Events.TOOL_ENABLED_CHANGED,
                    update: (eventData, seed) => {
                        return {
                            ...seed,
                            ...eventData,
                        };
                    },
                },
            ],
            true
        );

        window["$enabledTools"] = this;
    }
}
