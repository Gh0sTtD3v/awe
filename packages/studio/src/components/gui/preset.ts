import { deepEqual, isObject } from "../../utils/js";
import { getLens } from "./lens";

export interface PresetOpts {
    data: any;
    getCurrentData: () => any;
}

export class Preset {
    //
    constructor(public opts: PresetOpts) {}

    get data() {
        //
        return this.opts.data;
    }

    get currentData() {
        return this.opts.getCurrentData();
    }

    apply(canUndo: boolean) {
        //
        let prevData = Preset.apply(this.data, this.currentData, canUndo);

        if (!canUndo) return null;

        return {
            undo: async () => {
                //
                Preset.apply(prevData, this.currentData, false);
            },
            redo: async () => {
                //
                Preset.apply(this.data, this.currentData, false);
            },
        };
    }

    isApplied() {
        //
        return Preset.isEqual(this.data, this.currentData);
    }

    static apply(presetData: any, currentData: any, save: boolean) {
        //
        let prevData: any;

        if (save) {
            //
            prevData = Preset.save(presetData, currentData);
        }

        Preset._doApply(presetData, currentData);

        return prevData;
    }

    static save(presetData: any, currentData: any) {
        //
        let savedData: any = {};

        for (let key in presetData) {
            //
            const incoming = presetData[key];

            const current = currentData?.[key];

            if (isObject(current)) {
                //
                if (!isObject(incoming)) {
                    //
                    throw new Error("Preset.save: data mismatch");
                }

                savedData[key] = Preset.save(incoming, current);
                //
            } else {
                //
                savedData[key] = current;
            }
        }

        return savedData;
    }

    static isEqual(presetData: any, currentData: any) {
        //

        for (let key in presetData) {
            //
            const incoming = presetData[key];

            const current = currentData[key];

            if (isObject(current)) {
                //
                if (!isObject(incoming)) {
                    console.error(
                        "Preset.isEqual: data mismatch",
                        key,
                        incoming,
                        current
                    );

                    return false;
                }

                if (!Preset.isEqual(incoming, current)) {
                    return false;
                }

                continue;
            } else if (!deepEqual(incoming, current)) {
                //
                return false;
            }
        }

        return true;
    }

    static _doApply(presetData: any, currentData: any) {
        //
        for (let key in presetData) {
            //
            const incoming = presetData[key];

            const current = currentData?.[key];

            if (isObject(current)) {
                //
                if (!isObject(incoming)) {
                    //
                    throw new Error("Preset.save: data mismatch");
                }

                Preset._doApply(incoming, current);
                //
            } else {
                //
                currentData[key] = incoming;
            }
        }
    }

    private static _cache = new WeakMap<any, Preset>();

    static get(opts: { data: any; source: any }) {
        //
        let preset = this._cache.get(opts.data);

        if (preset == null) {
            const lens = getLens(opts.source);

            preset = new Preset({
                data: opts.data,
                getCurrentData: () => lens.get(),
            });

            this._cache.set(opts.data, preset);
        }

        return preset;
    }
}
