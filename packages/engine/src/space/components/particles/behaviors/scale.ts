import type {
    GuiFolderDescriptor,
    GuiValueBinding,
} from "../../../gui-types";
import type { ParticlesComponent } from "../particles-component";
import type {
    ParticleBehavior,
    BehaviorConfig,
    ParticleSpawnData,
    SpawnContext,
    RebuildHint,
} from "../particle-behavior";
import type { ValueGenerator } from "../value-generator";
import {
    sampleValue,
    normalizeValueGenerator,
    compareValueGenerators,
    scalarValueGUI,
} from "../value-generator";

/**
 * Detect and convert legacy config formats:
 * - useScaleRange=true + scaleMin/scaleMax -> IntervalValue
 * - useScaleRange=false + scale/scaleVariance -> IntervalValue or ConstantValue
 */
function normalizeConfig(config: BehaviorConfig): void {
    // Already migrated
    if (config.scale != null && typeof config.scale === "object" && "type" in config.scale) {
        return;
    }

    // Legacy format detection
    const isLegacy =
        config.useScaleRange != null ||
        (config.scale != null && typeof config.scale === "object" && "x" in config.scale) ||
        config.scaleVariance != null ||
        config.scaleMin != null;

    if (!isLegacy) return;

    if (config.useScaleRange) {
        const min = config.scaleMin ?? { x: 0.5, y: 0.5, z: 0.5 };
        const max = config.scaleMax ?? { x: 0.5, y: 0.5, z: 0.5 };
        const avgMin = (min.x + min.y + min.z) / 3;
        const avgMax = (max.x + max.y + max.z) / 3;
        config.scale = { type: "interval", min: avgMin, max: avgMax };
    } else {
        const s = config.scale ?? { x: 1, y: 1, z: 1 };
        const avg = (s.x + s.y + s.z) / 3;
        const variance = config.scaleVariance ?? 0;
        if (Math.abs(variance) < 0.001) {
            config.scale = { type: "constant", value: avg };
        } else {
            config.scale = { type: "interval", min: avg, max: avg + variance };
        }
    }

    // Clean up legacy fields
    delete config.useScaleRange;
    delete config.scaleMin;
    delete config.scaleMax;
    delete config.scaleVariance;
}

export class ScaleBehavior implements ParticleBehavior {
    static behaviorName = "scale";
    static label = "Scale";
    static defaults: BehaviorConfig = {
        animateIn: true,
        animateOut: true,
        scale: { type: "interval", min: 0.5, max: 1.5 },
    };

    constructor(
        private host: ParticlesComponent,
        private config: BehaviorConfig
    ) {
        normalizeConfig(this.config);
    }

    private getScaleGen(): ValueGenerator {
        return normalizeValueGenerator(this.config.scale as ValueGenerator, 1);
    }

    getPlugin(): any {
        const cfg = this.config;
        const plugin: any = {
            name: "ParticleScalePlugin",
            uniforms: {},
            vertexShaderHooks: {
                main: `
                    float tempScale = 1.0;

                    #ifdef ANIMATE_IN
                        float animateInFactor = smoothstep(0.0, 0.2, life);
                        tempScale *= animateInFactor;
                    #endif

                    #ifndef PERPETUAL_LIFE

                        #ifdef ANIMATE_OUT
                            float animateOutFactor = smoothstep(0.8, 1.0, life);
                            tempScale *= 1.0 - animateOutFactor;
                        #endif
                    #endif

                    particleScale *= tempScale;
                `,
            },
            defines: [] as any,
        };

        if (cfg.animateIn) {
            plugin.defines["ANIMATE_IN"] = "";
        }
        if (cfg.animateOut) {
            plugin.defines["ANIMATE_OUT"] = "";
        }

        return plugin;
    }

    applySpawnData(data: ParticleSpawnData, _context: SpawnContext): void {
        if (data.scale) {
            const gen = this.getScaleGen();
            const val = sampleValue(gen);
            data.scale.x = val;
            data.scale.y = val;
            data.scale.z = val;
        }
    }

    onConfigChange(config: BehaviorConfig, prev: BehaviorConfig): RebuildHint {
        this.config = config;
        normalizeConfig(this.config);

        if (
            config.animateIn !== prev.animateIn ||
            config.animateOut !== prev.animateOut
        ) {
            return "rebuild";
        }

        const scaleChange = compareValueGenerators(
            config.scale as ValueGenerator,
            prev.scale as ValueGenerator,
            1
        );
        if (scaleChange === "rebuild") return "rebuild";

        return "none";
    }

    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor {
        const opts = [...dataBinding, "options"];

        const scaleChildren = scalarValueGUI({
            optsPath: opts,
            field: "scale",
            getConfig: () => this.config,
            max: 10,
            min: 0.001,
            step: 0.001,
            label: "Scale",
        });

        return {
            type: "folder",
            label: ScaleBehavior.label,
            children: {
                animateIn: {
                    type: "checkbox",
                    label: "Animate In",
                    value: [...opts, "animateIn"],
                },
                animateOut: {
                    type: "checkbox",
                    label: "Animate Out",
                    value: [...opts, "animateOut"],
                },
                ...scaleChildren,
            },
        };
    }

    dispose() {}
}
