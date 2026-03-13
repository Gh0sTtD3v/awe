import { Component3D } from "../../space/abstract/component-3d";
import { Mesh } from "three";
import emitter from "../engine-emitter";
import { EngineEvents } from "../engine-events";
import { getFrame } from "./frame-counter";

export class FrustumChecker {
    _frame = -1;
    _inFrustrum = false;

    constructor(
        private opts: {
            component: Component3D;
            mesh: Mesh;
        }
    ) {
        //
        const onBeforeRender = opts.mesh.onBeforeRender;

        emitter.on(EngineEvents.UPDATE, this._onPreUpdate);

        opts.mesh.onBeforeRender = (renderer, ...args) => {
            //
            onBeforeRender?.(renderer, ...args);

            this._frame = getFrame();
        };

        opts.component.on(opts.component.EVENTS.DISPOSED, () => {
            //
            this.dispose();
        });
    }

    private _onPreUpdate = () => {
        //
        const wasInFrustrum = this._inFrustrum;

        this._inFrustrum = this._frame === getFrame();

        if (wasInFrustrum && !this._inFrustrum) {
            //
            // console.log("Frustum exit", this.opts.component);
            this.opts.component.emit(this.opts.component.EVENTS.VIEW_EXIT);
        } else if (!wasInFrustrum && this._inFrustrum) {
            //
            // console.log("Frustum enter", this.opts.component);
            this.opts.component.emit(this.opts.component.EVENTS.VIEW_ENTER);
        }
    };

    dispose() {
        //
        emitter.off(EngineEvents.UPDATE, this._onPreUpdate);
    }
}
