import type {
    GuiFolderDescriptor,
    GuiValueBinding,
} from "../../../gui-types";
import type { ParticlesComponent } from "../particles-component";
import type {
    ParticleBehavior,
    BehaviorConfig,
    RebuildHint,
} from "../particle-behavior";
import type { CurveValue } from "../value-generator";
import {
    encodeCurveUniforms,
    generateCurveGLSL,
    compareValueGenerators,
    curveValueGUI,
    isLegacyFlatCurve,
    legacyFlatToCurve,
} from "../value-generator";

const LEGACY_DEFAULTS: BehaviorConfig = {
    enabled: true,
    pointCount: 4,
    pos0: 0.0,
    val0: 0.0,
    pos1: 0.1,
    val1: 1.0,
    pos2: 0.8,
    val2: 1.0,
    pos3: 1.0,
    val3: 0.0,
    pos4: 0.25,
    val4: 1.0,
    pos5: 0.5,
    val5: 1.0,
    pos6: 0.6,
    val6: 1.0,
    pos7: 0.75,
    val7: 1.0,
};

function normalizeConfig(config: BehaviorConfig): void {
    if (isLegacyFlatCurve(config, "sizeCurve")) {
        config.sizeCurve = legacyFlatToCurve(config, LEGACY_DEFAULTS);
    }
}

const DEFAULT_CURVE: CurveValue = {
    type: "curve",
    points: [
        { pos: 0.0, value: 0.0 },
        { pos: 0.1, value: 1.0 },
        { pos: 0.8, value: 1.0 },
        { pos: 1.0, value: 0.0 },
    ],
};

export class SizeOverLifeBehavior implements ParticleBehavior {
    static behaviorName = "sizeOverLife";
    static label = "Size Over Life";
    static defaults: BehaviorConfig = {
        enabled: true,
        sizeCurve: DEFAULT_CURVE,
    };

    private plugin: any = null;

    constructor(
        private host: ParticlesComponent,
        private config: BehaviorConfig
    ) {
        normalizeConfig(this.config);
    }

    private getCurve(): CurveValue {
        return (this.config.sizeCurve as CurveValue) ?? DEFAULT_CURVE;
    }

    getPlugin(): any | null {
        const cfg = this.config;

        if (!cfg.enabled) {
            this.plugin = null;
            return null;
        }

        const curve = this.getCurve();
        const { positions, values, count } = encodeCurveUniforms(curve);

        const plugin: any = {
            name: "ParticleSizeOverLifePlugin",
            uniforms: {
                solPositions: { value: positions },
                solValues: { value: values },
            },
            vertexShaderHooks: {
                prefix:
                    generateCurveGLSL("sol", "SOL_POINT_COUNT") +
                    `
                    float evaluateSizeOverLife(float t) {
                        return evaluate_sol(t);
                    }
                    `,
                main: `
                    #ifndef PERPETUAL_LIFE
                        float solMultiplier = evaluateSizeOverLife(life);
                        particleScale *= solMultiplier;
                    #endif
                `,
            },
            defines: {
                SOL_POINT_COUNT: String(count),
            } as any,
        };

        this.plugin = plugin;
        return plugin;
    }

    onFrame(_delta: number): void {
        if (!this.plugin || !this.config.enabled) return;

        const curve = this.getCurve();
        const { positions, values } = encodeCurveUniforms(curve);
        const u = this.plugin.uniforms;

        u.solPositions.value = positions;
        u.solValues.value = values;
    }

    onConfigChange(config: BehaviorConfig, prev: BehaviorConfig): RebuildHint {
        this.config = config;
        normalizeConfig(this.config);

        if (config.enabled !== prev.enabled) {
            return "rebuild";
        }

        const curveChange = compareValueGenerators(
            config.sizeCurve,
            prev.sizeCurve,
            0
        );
        if (curveChange === "rebuild") return "rebuild";

        return "none";
    }

    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor {
        const opts = [...dataBinding, "options"];

        const isEnabled = () => this.config.enabled !== false;

        const curveChildren = curveValueGUI({
            optsPath: opts,
            field: "sizeCurve",
            getConfig: () => this.config,
            maxVal: 2,
            step: 0.01,
        });

        // Gate all curve children on enabled
        for (const key of Object.keys(curveChildren)) {
            const desc = curveChildren[key] as any;
            const origVisible = desc.visible;
            desc.visible = origVisible
                ? () => isEnabled() && origVisible()
                : isEnabled;
        }

        const children: Record<string, any> = {
            enabled: {
                type: "checkbox",
                label: "Enabled",
                value: [...opts, "enabled"],
            },
            ...curveChildren,
        };

        return {
            type: "folder",
            label: SizeOverLifeBehavior.label,
            children,
        };
    }

    dispose() {
        this.plugin = null;
    }
}
