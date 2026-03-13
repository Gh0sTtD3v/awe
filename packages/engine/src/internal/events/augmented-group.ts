import { Group } from "three";
import Augmented, { Listener } from "./augmented";

/**
 * Three.js Group with built-in event emitter capabilities.
 * @public
 */
export default class AugmentedGroup extends Group {
    protected $emitter = new Augmented({
        scope: "engine",
        parent: this,
    });

    constructor() {
        super();
    }

    /** Checks if there are listeners for an event type */
    hasListeners(type: string) {
        return this.$emitter.hasListeners(type);
    }

    /** Registers an event listener */
    on(type: string, callback: Listener) {
        this.$emitter.on(type, callback);
    }

    /** Registers a one-time event listener */
    once(type: string, callback: Listener) {
        this.$emitter.once(type, callback);
    }

    /** Removes an event listener */
    off(type: string, callback: Listener) {
        this.$emitter.off(type, callback);
    }

    /** Emits an event */
    emit(type: string, ...args: unknown[]) {
        this.$emitter.emit(type, ...args);
    }

    /** @internal */
    _emitError(err: unknown, opts?: { scope?: "engine" | "script"; data?: unknown; script?: unknown }) {
        this.$emitter._emitError({
            ...this.$emitter._getErrPayload(err),
            ...opts,
        });
    }
}
