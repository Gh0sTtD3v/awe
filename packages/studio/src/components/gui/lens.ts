// @ts-check

import { hasOwn, noop } from "../../utils/js";

interface ILens {
    get(): any;
    set(value: any, opts?: any): void;
    reset?: () => void;
    isLocked?: () => boolean;
}

type LensPart = { key: string; optional: boolean };

export class PathLens implements ILens {
    //

    _IS_LENS = true;

    object: any;

    path: Array<LensPart>;

    constructor({ object, path }) {
        //
        this._IS_LENS = true;

        this.object = object;

        /**
         * @type {Array<{key: string, optional: boolean}>}
         */
        this.path = path.map((key) => {
            if (key.endsWith("?")) {
                return {
                    key: key.slice(0, -1),
                    optional: true,
                };
            } else {
                return {
                    key,
                    optional: false,
                };
            }
        });
    }

    get() {
        //
        let curr = this.object;

        for (let i = 0; i < this.path.length; i++) {
            //
            const prop = this.path[i];

            if (curr === null || typeof curr !== "object") {
                return undefined;
            }

            curr = curr[prop.key];
        }

        return curr;
    }

    set(value) {
        //
        let curr = this.object;

        for (let i = 0; i < this.path.length - 1; i++) {
            //
            let prop = this.path[i];

            if (!(prop.key in curr)) {
                //
                if (prop.optional) {
                    //
                    curr[prop.key] = {};
                    //
                } else {
                    //
                    throw new Error(
                        `Path not found: ${this.path.slice(0, i + 1).join(".")}`
                    );
                }
            }

            curr = curr[prop.key];
        }

        curr[this.path[this.path.length - 1].key] = value;
    }
}

export class Lens implements ILens {
    //

    _IS_LENS = true;

    getter: () => any;

    setter: (value: any, opts) => void;

    resetter: () => void;

    constructor({ getter, setter = noop, reseter = null }) {
        //
        this.getter = getter;

        this.setter = setter;

        this.resetter = reseter;
    }

    get() {
        //
        return this.getter();
    }

    set(value, opts) {
        //
        this.setter(value, opts);
    }

    canReset = () => {
        //
        return this.resetter != null;
    };

    reset = () => {
        //
        this.reset();
    };

    isLocked = () => {
        //
        return false;
    };
}

const idLens = (v) => {
    //
    return new Lens({
        getter: () => v,
        setter: () => {},
    });
};

const lensMap = new WeakMap();

export function getLens(state) {
    //
    if (state?._IS_LENS) return state;

    let lens = lensMap.get(state);

    if (!lens) {
        //
        lens = createLens(state);

        lensMap.set(state, lens);
    }

    return lens;
}

function createLens(state) {
    //
    if (typeof state === "function") {
        //
        return new Lens({
            getter: state,
        });
    }

    if (Array.isArray(state)) {
        //
        return new PathLens({
            object: state[0],
            path: state.slice(1),
        });
    }

    if (state?.get) {
        //
        return new Lens({
            getter: () => state.get(),
            setter: (value, opts) => state.set?.(value, opts),
            reseter: state.reset ? () => state.reset() : null,
        });
    } else {
        //
        return idLens(state);
    }
}

export function isLocked(lens) {
    //
    return lens.isLocked?.();
}

export function getSource(lens) {
    //
    if (!lens.__CDATA_WRAPPER__) return null;

    const wrapper = lens.__CDATA_WRAPPER__;

    return wrapper;
}

export function getChanges(lens, value) {
    //
    // if (!lens.__CDATA_WRAPPER__) return null;

    const path = lens.path;

    const changes = {};

    let current = changes;

    path.forEach((part, i) => {
        //
        const key = part.key ?? part;

        if (i === path.length - 1) {
            //
            current[key] = value;
        } else {
            //
            current[key] = {};

            current = current[key];
        }
    });

    return changes;
}
