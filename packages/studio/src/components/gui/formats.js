import { Color } from "three";

export const idFormat = {
    format: (value, opts) => value,
    parse: (value, prev, opts) => value,
};

export const numberFormat = {
    format: (value, opts) => {
        if (value == null) return 0;
        return +value.toFixed(opts?.decimals || 4);
    },
    parse: (value, prev, opts) => parseFloat(value),
};

function copyXYZ(dst, src) {
    if (src == null) return;

    if (src.x != null) {
        //
        dst.x = src.x;
    }

    if (src.y != null) {
        //
        dst.y = src.y;
    }

    if (src.z != null) {
        //
        dst.z = src.z;
    }
}

function cloneXYZ(v) {
    //
    let result = {};

    copyXYZ(result, v);

    return result;
}

export const xyzFormat = {
    //
    format: (value, opts) => {
        if (value == null) return { x: 0, y: 0, z: 0 };

        let result = { x: 0 };

        copyXYZ(result, value);

        if (result.x == null) debugger;

        result.x = +result.x.toFixed(opts?.decimals || 4);

        if (result.y != null) {
            result.y = +result.y.toFixed(opts?.decimals || 4);
        }

        if (result.z != null) {
            result.z = +result.z.toFixed(opts?.decimals || 4);
        }

        return result;
    },
    //
    parse: (value, prev, opts = {}) => {
        //
        return cloneXYZ(value);
    },
};

const c = new Color();

export const colorFormat = {
    //
    format(v) {
        if (v == null) return "#000000";

        if (v instanceof Color) {
            //
            return "#" + v.getHexString();
            //
        } else if (Array.isArray(v)) {
            //
            c.fromArray(v);

            return "#" + c.getHexString();
            //
        } else if (typeof v === "string") {
            //
            return v;
        } else if (typeof v === "number") {
            c.set(v);

            return "#" + c.getHexString();
        } else {
            console.log(v);
            //
            throw new Error("invalid color value");
        }
    },

    parse(v, prev, opts = {}) {
        //
        if (prev instanceof Color) {
            //
            if (opts.immutable) {
                prev = prev.clone;
            }

            return prev.set(v);
            //
        } else if (Array.isArray(prev)) {
            //
            if (opts.immutable) {
                //
                prev = prev.slice();
            }

            c.set(v);

            prev[0] = c.r;
            prev[1] = c.g;
            prev[2] = c.b;

            return prev;
            //
        } else if (typeof prev === "number") {
            //
            c.set(v);

            return c.getHex();
        } else {
            //
            return v;
        }
    },
};

const formats = {
    xyz: xyzFormat,
    number: numberFormat,
    color: colorFormat,
};

export function getFormat(type) {
    return formats[type] ?? idFormat;
}
