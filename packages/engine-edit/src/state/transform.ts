import { WorldObservable } from "../utils/observable";
import { Component3D } from "@oncyberio/engine/space/abstract/component-3d";
import Events from "../editor-events";

export interface TransformerState {
    enableTranslate: boolean;
    enableRotate: boolean;
    enableLocalSpace: boolean;
    targets: Component3D[];
}

export class TransformerStateObservable extends WorldObservable<TransformerState> {
    constructor() {
        super(
            {
                enableTranslate: true,
                enableRotate: true,
                enableLocalSpace: true,
                targets: [],
            },
            [
                {
                    event: Events.TRANSFORM_MODE_CHANGED,
                    update: (eventData, seed) => {
                        return {
                            ...seed,
                            ...eventData.mode,
                        };
                    },
                },
                {
                    event: Events.TRANSFORM_TARGET_CHANGED,
                    update: (eventData, seed) => {
                        return {
                            ...seed,
                            targets: eventData.targets,
                        };
                    },
                },
            ],
            true
        );

        window["$transformMode"] = this;
    }
}
