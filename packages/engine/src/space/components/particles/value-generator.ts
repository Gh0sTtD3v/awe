/**
 * Value generator abstraction for particle behaviors.
 *
 * Provides three composable numeric value types:
 * - ConstantValue: always returns the same number
 * - IntervalValue: random number between min and max (sampled at spawn)
 * - CurveValue: piecewise-linear curve evaluated over particle lifetime (GPU)
 */

import type {
    GuiObjectLens,
    GuiDescriptor,
    GuiSelectItem,
} from "../../gui-types";
import type { BehaviorConfig } from "./particle-behavior";

// ---------------------------------------------------------------------------
// Data types (serializable JSON)
// ---------------------------------------------------------------------------

export interface ConstantValue {
    type: "constant";
    value: number;
}

export interface IntervalValue {
    type: "interval";
    min: number;
    max: number;
}

export interface CurvePoint {
    pos: number;
    value: number;
}

export interface CurveValue {
    type: "curve";
    points: CurvePoint[];
}

export type ValueGenerator = ConstantValue | IntervalValue | CurveValue;

// ---------------------------------------------------------------------------
// Normalization (backward compatibility)
// ---------------------------------------------------------------------------

/**
 * Normalize a raw value into a ValueGenerator. Accepts:
 * - A plain number -> ConstantValue
 * - An already-valid ValueGenerator -> returned as-is
 * - undefined/null -> ConstantValue with the given fallback
 */
export function normalizeValueGenerator(
    v: number | ValueGenerator | undefined | null,
    fallback: number
): ValueGenerator {
    if (v == null) {
        return { type: "constant", value: fallback };
    }
    if (typeof v === "number") {
        return { type: "constant", value: v };
    }
    return v;
}

// ---------------------------------------------------------------------------
// CPU evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a piecewise-linear curve at parameter t (0..1).
 */
export function evaluateCurve(points: CurvePoint[], t: number): number {
    if (points.length === 0) return 0;
    if (t <= points[0].pos) return points[0].value;

    for (let i = 1; i < points.length; i++) {
        if (t <= points[i].pos) {
            const segLen = points[i].pos - points[i - 1].pos;
            const segT = segLen > 0 ? (t - points[i - 1].pos) / segLen : 0;
            return points[i - 1].value + (points[i].value - points[i - 1].value) * segT;
        }
    }

    return points[points.length - 1].value;
}

/**
 * Sample a value from a generator.
 * - constant: returns the value
 * - interval: returns a random number in [min, max]
 * - curve: evaluates at parameter t (default 0)
 */
export function sampleValue(gen: ValueGenerator, t?: number): number {
    switch (gen.type) {
        case "constant":
            return gen.value;
        case "interval":
            return gen.min + Math.random() * (gen.max - gen.min);
        case "curve":
            return evaluateCurve(gen.points, t ?? 0);
    }
}

// ---------------------------------------------------------------------------
// GPU utilities
// ---------------------------------------------------------------------------

export const MAX_CURVE_POINTS = 8;

/**
 * Encode a CurveValue as parallel float arrays for shader uniforms.
 * Always pads to MAX_CURVE_POINTS entries.
 */
export function encodeCurveUniforms(curve: CurveValue): {
    positions: number[];
    values: number[];
    count: number;
} {
    const positions: number[] = [];
    const values: number[] = [];
    const count = Math.min(curve.points.length, MAX_CURVE_POINTS);

    for (let i = 0; i < MAX_CURVE_POINTS; i++) {
        if (i < count) {
            positions.push(curve.points[i].pos);
            values.push(curve.points[i].value);
        } else {
            // Pad with last point values or defaults
            const last = count > 0 ? curve.points[count - 1] : { pos: 1, value: 1 };
            positions.push(last.pos);
            values.push(last.value);
        }
    }

    return { positions, values, count };
}

/**
 * Generate GLSL for a piecewise-linear evaluation function.
 *
 * Produces:
 * - uniform declarations for positions and values arrays
 * - `float evaluate_<prefix>(float t)` function
 */
export function generateCurveGLSL(prefix: string, countDefine: string): string {
    return `
    uniform float ${prefix}Positions[${MAX_CURVE_POINTS}];
    uniform float ${prefix}Values[${MAX_CURVE_POINTS}];

    float evaluate_${prefix}(float t) {
        if (t <= ${prefix}Positions[0]) return ${prefix}Values[0];

        for (int i = 1; i < ${countDefine}; i++) {
            if (t <= ${prefix}Positions[i]) {
                float segT = (t - ${prefix}Positions[i - 1])
                           / (${prefix}Positions[i] - ${prefix}Positions[i - 1]);
                return mix(${prefix}Values[i - 1], ${prefix}Values[i], segT);
            }
        }

        return ${prefix}Values[${countDefine} - 1];
    }
    `;
}

/**
 * Generate GLSL for the analytical integral of a piecewise-linear curve.
 *
 * Produces: `float integrate_<prefix>(float t)` function.
 * Assumes the uniform declarations from generateCurveGLSL are already present.
 */
export function generateCurveIntegralGLSL(
    prefix: string,
    countDefine: string
): string {
    return `
    float integrate_${prefix}(float t) {
        float result = 0.0;

        for (int i = 1; i < ${countDefine}; i++) {
            float segStart = ${prefix}Positions[i - 1];
            float segEnd   = ${prefix}Positions[i];

            if (t <= segStart) break;

            float clampedEnd = min(t, segEnd);
            float dt = clampedEnd - segStart;
            float segLen = segEnd - segStart;

            float frac = dt / max(segLen, 0.0001);
            float valAtEnd = mix(${prefix}Values[i - 1], ${prefix}Values[i], frac);

            result += dt * (${prefix}Values[i - 1] + valAtEnd) * 0.5;
        }

        return result;
    }
    `;
}

// ---------------------------------------------------------------------------
// Config change comparison
// ---------------------------------------------------------------------------

/**
 * Compare two ValueGenerator configs. Returns "rebuild" if the type changed
 * or the curve point count changed; "none" otherwise.
 */
export function compareValueGenerators(
    curr: ValueGenerator | undefined | null,
    prev: ValueGenerator | undefined | null,
    fallback: number
): "none" | "rebuild" {
    const a = normalizeValueGenerator(curr, fallback);
    const b = normalizeValueGenerator(prev, fallback);

    if (a.type !== b.type) return "rebuild";

    if (a.type === "curve" && b.type === "curve") {
        if (a.points.length !== b.points.length) return "rebuild";
    }

    return "none";
}

// ---------------------------------------------------------------------------
// Legacy flat-curve conversion
// ---------------------------------------------------------------------------

/**
 * Convert legacy flat pos0/val0..pos7/val7 config to a CurveValue.
 * Used by SizeOverLife and SpeedOverLife for backward compatibility.
 */
export function legacyFlatToCurve(
    config: BehaviorConfig,
    defaults: BehaviorConfig
): CurveValue {
    const count = config.pointCount ?? defaults.pointCount ?? 4;
    const points: CurvePoint[] = [];
    for (let i = 0; i < count; i++) {
        points.push({
            pos: config[`pos${i}`] ?? defaults[`pos${i}`] ?? 0,
            value: config[`val${i}`] ?? defaults[`val${i}`] ?? 0,
        });
    }
    return { type: "curve", points };
}

/**
 * Check whether a behavior config uses the legacy flat curve format.
 */
export function isLegacyFlatCurve(config: BehaviorConfig, curveField: string): boolean {
    return config[curveField] == null && config.pos0 != null;
}

// ---------------------------------------------------------------------------
// GUI descriptor factories
// ---------------------------------------------------------------------------

interface CurveValueGUIOptions {
    /** Data binding path to the behavior options object */
    optsPath: unknown[];
    /** Name of the CurveValue field within options (e.g. "sizeCurve") */
    field: string;
    /** Access to the live config for visibility functions */
    getConfig: () => BehaviorConfig;
    /** Max value for the value inputs */
    maxVal?: number;
    /** Step for value inputs */
    step?: number;
}

/**
 * Generate GUI descriptors for a CurveValue field.
 * Returns a record of children suitable for a folder descriptor.
 */
export function curveValueGUI(opts: CurveValueGUIOptions): Record<string, GuiDescriptor> {
    const { optsPath, field, getConfig, maxVal = 2, step = 0.01 } = opts;

    const getCurve = (): CurveValue | undefined => {
        const cfg = getConfig();
        return cfg[field] as CurveValue | undefined;
    };

    const getPointCount = () => getCurve()?.points?.length ?? 4;

    const children: Record<string, GuiDescriptor> = {};

    // Point count selector
    children.pointCount = {
        type: "select",
        label: "Points",
        value: {
            get() {
                return getPointCount();
            },
            set(v: number) {
                const curve = getCurve();
                if (!curve) return;
                const current = curve.points.length;
                if (v === current) return;
                if (v > current) {
                    // Add new points with interpolated positions
                    for (let i = current; i < v; i++) {
                        const lastPos = curve.points[curve.points.length - 1]?.pos ?? 0;
                        curve.points.push({ pos: Math.min(lastPos + 0.1, 1), value: 1 });
                    }
                } else {
                    curve.points.length = v;
                }
            },
        } satisfies GuiObjectLens<number>,
        items: [2, 3, 4, 5, 6, 7, 8].map(
            (n): GuiSelectItem => ({ id: n, label: String(n) })
        ),
        mode: "buttons",
    };

    // Per-point position and value controls
    for (let i = 0; i < MAX_CURVE_POINTS; i++) {
        const idx = i; // capture for closure

        children[`pos${i}`] = {
            type: "number",
            label: `Position ${i + 1}`,
            value: {
                get() {
                    return getCurve()?.points[idx]?.pos ?? 0;
                },
                set(v: number) {
                    const curve = getCurve();
                    if (curve && curve.points[idx]) {
                        curve.points[idx].pos = v;
                    }
                },
            } satisfies GuiObjectLens<number>,
            step,
            min: 0,
            max: 1,
            visible: () => getPointCount() > idx,
        };

        children[`val${i}`] = {
            type: "number",
            label: `Value ${i + 1}`,
            value: {
                get() {
                    return getCurve()?.points[idx]?.value ?? 0;
                },
                set(v: number) {
                    const curve = getCurve();
                    if (curve && curve.points[idx]) {
                        curve.points[idx].value = v;
                    }
                },
            } satisfies GuiObjectLens<number>,
            step,
            min: 0,
            max: maxVal,
            visible: () => getPointCount() > idx,
        };
    }

    return children;
}

interface ScalarValueGUIOptions {
    /** Data binding path to the behavior options object */
    optsPath: unknown[];
    /** Name of the ValueGenerator field within options (e.g. "scale") */
    field: string;
    /** Access to the live config for visibility/reads */
    getConfig: () => BehaviorConfig;
    /** Max value for number inputs */
    max?: number;
    /** Min value for number inputs */
    min?: number;
    /** Step for number inputs */
    step?: number;
    /** Label prefix */
    label?: string;
}

/**
 * Generate GUI descriptors for a ConstantValue/IntervalValue field.
 * Returns a record of children suitable for a folder descriptor.
 */
export function scalarValueGUI(opts: ScalarValueGUIOptions): Record<string, GuiDescriptor> {
    const {
        field,
        getConfig,
        max = 10,
        min = 0,
        step = 0.001,
        label = "Value",
    } = opts;

    const getGen = (): ValueGenerator | undefined => {
        const cfg = getConfig();
        return cfg[field] as ValueGenerator | undefined;
    };

    const getMode = (): "constant" | "interval" => {
        const gen = getGen();
        if (gen?.type === "interval") return "interval";
        return "constant";
    };

    const children: Record<string, GuiDescriptor> = {};

    children.mode = {
        type: "select",
        label: "Mode",
        value: {
            get() {
                return getMode();
            },
            set(v: string) {
                const cfg = getConfig();
                const curr = getGen();
                if (v === "constant") {
                    const val =
                        curr?.type === "constant"
                            ? curr.value
                            : curr?.type === "interval"
                              ? (curr.min + curr.max) / 2
                              : 1;
                    cfg[field] = { type: "constant", value: val } satisfies ConstantValue;
                } else {
                    const val =
                        curr?.type === "constant"
                            ? curr.value
                            : curr?.type === "interval"
                              ? curr.min
                              : 1;
                    cfg[field] = {
                        type: "interval",
                        min: val * 0.5,
                        max: val * 1.5,
                    } satisfies IntervalValue;
                }
            },
        } satisfies GuiObjectLens<string>,
        items: [
            { id: "constant", label: "Constant" },
            { id: "interval", label: "Interval" },
        ],
        mode: "buttons",
    };

    children.value = {
        type: "number",
        label,
        value: {
            get() {
                const gen = getGen();
                return gen?.type === "constant" ? gen.value : 1;
            },
            set(v: number) {
                const cfg = getConfig();
                cfg[field] = { type: "constant", value: v } satisfies ConstantValue;
            },
        } satisfies GuiObjectLens<number>,
        step,
        min,
        max,
        visible: () => getMode() === "constant",
    };

    children.min = {
        type: "number",
        label: `${label} Min`,
        value: {
            get() {
                const gen = getGen();
                return gen?.type === "interval" ? gen.min : 0;
            },
            set(v: number) {
                const cfg = getConfig();
                const gen = getGen();
                const maxVal = gen?.type === "interval" ? gen.max : 1;
                cfg[field] = {
                    type: "interval",
                    min: v,
                    max: maxVal,
                } satisfies IntervalValue;
            },
        } satisfies GuiObjectLens<number>,
        step,
        min,
        max,
        visible: () => getMode() === "interval",
    };

    children.max = {
        type: "number",
        label: `${label} Max`,
        value: {
            get() {
                const gen = getGen();
                return gen?.type === "interval" ? gen.max : 1;
            },
            set(v: number) {
                const cfg = getConfig();
                const gen = getGen();
                const minVal = gen?.type === "interval" ? gen.min : 0;
                cfg[field] = {
                    type: "interval",
                    min: minVal,
                    max: v,
                } satisfies IntervalValue;
            },
        } satisfies GuiObjectLens<number>,
        step,
        min,
        max,
        visible: () => getMode() === "interval",
    };

    return children;
}
