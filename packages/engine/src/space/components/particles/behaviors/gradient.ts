import { Color } from "three";
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

const _c = new Color();

export class GradientBehavior implements ParticleBehavior {
    static behaviorName = "gradient";
    static label = "Gradient";
    static defaults: BehaviorConfig = {
        enabled: true,
        stopCount: 2,
        color0: 0xffffff,
        color1: 0x000000,
        color2: 0xff8800,
        color3: 0x000000,
        alpha0: 1.0,
        alpha1: 0.0,
        alpha2: 0.5,
        alpha3: 0.0,
        pos0: 0.0,
        pos1: 1.0,
        pos2: 0.5,
        pos3: 0.75,
    };

    private plugin: any = null;

    constructor(
        private host: ParticlesComponent,
        private config: BehaviorConfig
    ) {}

    getPlugin(): any | null {
        const cfg = this.config;
        if (!cfg.enabled) {
            this.plugin = null;
            return null;
        }

        const stopCount = cfg.stopCount ?? GradientBehavior.defaults.stopCount;

        const toVec3 = (hex: number) => {
            _c.setHex(hex);
            return { x: _c.r, y: _c.g, z: _c.b };
        };

        const plugin: any = {
            name: "ParticleGradientPlugin",
            uniforms: {
                gradColor0: {
                    value: toVec3(cfg.color0 ?? GradientBehavior.defaults.color0),
                },
                gradColor1: {
                    value: toVec3(cfg.color1 ?? GradientBehavior.defaults.color1),
                },
                gradAlpha0: {
                    value: cfg.alpha0 ?? GradientBehavior.defaults.alpha0,
                },
                gradAlpha1: {
                    value: cfg.alpha1 ?? GradientBehavior.defaults.alpha1,
                },
                gradPos0: {
                    value: cfg.pos0 ?? GradientBehavior.defaults.pos0,
                },
                gradPos1: {
                    value: cfg.pos1 ?? GradientBehavior.defaults.pos1,
                },
            },
            vertexShaderHooks: {
                prefix: ``,
                main: ``,
                suffix: ``,
            },
            fragmentShaderHooks: {
                prefix: `
                    uniform vec3  gradColor0;
                    uniform vec3  gradColor1;
                    uniform float gradAlpha0;
                    uniform float gradAlpha1;
                    uniform float gradPos0;
                    uniform float gradPos1;

                    #if GRADIENT_STOPS >= 3
                        uniform vec3  gradColor2;
                        uniform float gradAlpha2;
                        uniform float gradPos2;
                    #endif

                    #if GRADIENT_STOPS >= 4
                        uniform vec3  gradColor3;
                        uniform float gradAlpha3;
                        uniform float gradPos3;
                    #endif

                    vec4 sampleGradient(float t) {
                        vec3  col = gradColor0;
                        float a   = gradAlpha0;

                        float f01 = smoothstep(gradPos0, gradPos1, t);
                        col = mix(gradColor0, gradColor1, f01);
                        a   = mix(gradAlpha0, gradAlpha1, f01);

                        #if GRADIENT_STOPS >= 3
                            float f12 = smoothstep(gradPos1, gradPos2, t);
                            col = mix(col, gradColor2, f12);
                            a   = mix(a,   gradAlpha2, f12);
                        #endif

                        #if GRADIENT_STOPS >= 4
                            float f23 = smoothstep(gradPos2, gradPos3, t);
                            col = mix(col, gradColor3, f23);
                            a   = mix(a,   gradAlpha3, f23);
                        #endif

                        return vec4(col, a);
                    }
                `,
                main: ``,
                suffix: `
                    vec4 grad = sampleGradient(vLife);
                    gl_FragColor.rgb *= grad.rgb;
                    gl_FragColor.a   *= grad.a;
                `,
            },
            defines: {
                GRADIENT_STOPS: String(stopCount),
            } as any,
        };

        if (stopCount >= 3) {
            plugin.uniforms.gradColor2 = {
                value: toVec3(cfg.color2 ?? GradientBehavior.defaults.color2),
            };
            plugin.uniforms.gradAlpha2 = {
                value: cfg.alpha2 ?? GradientBehavior.defaults.alpha2,
            };
            plugin.uniforms.gradPos2 = {
                value: cfg.pos2 ?? GradientBehavior.defaults.pos2,
            };
        }
        if (stopCount >= 4) {
            plugin.uniforms.gradColor3 = {
                value: toVec3(cfg.color3 ?? GradientBehavior.defaults.color3),
            };
            plugin.uniforms.gradAlpha3 = {
                value: cfg.alpha3 ?? GradientBehavior.defaults.alpha3,
            };
            plugin.uniforms.gradPos3 = {
                value: cfg.pos3 ?? GradientBehavior.defaults.pos3,
            };
        }

        this.plugin = plugin;
        return plugin;
    }

    onFrame(_delta: number): void {
        if (!this.plugin || !this.config.enabled) return;

        const cfg = this.config;
        const d = GradientBehavior.defaults;
        const u = this.plugin.uniforms;

        const toVec3 = (hex: number) => {
            _c.setHex(hex);
            return { x: _c.r, y: _c.g, z: _c.b };
        };

        u.gradColor0.value = toVec3(cfg.color0 ?? d.color0);
        u.gradColor1.value = toVec3(cfg.color1 ?? d.color1);
        u.gradAlpha0.value = cfg.alpha0 ?? d.alpha0;
        u.gradAlpha1.value = cfg.alpha1 ?? d.alpha1;
        u.gradPos0.value = cfg.pos0 ?? d.pos0;
        u.gradPos1.value = cfg.pos1 ?? d.pos1;

        if (u.gradColor2) {
            u.gradColor2.value = toVec3(cfg.color2 ?? d.color2);
            u.gradAlpha2.value = cfg.alpha2 ?? d.alpha2;
            u.gradPos2.value = cfg.pos2 ?? d.pos2;
        }
        if (u.gradColor3) {
            u.gradColor3.value = toVec3(cfg.color3 ?? d.color3);
            u.gradAlpha3.value = cfg.alpha3 ?? d.alpha3;
            u.gradPos3.value = cfg.pos3 ?? d.pos3;
        }
    }

    onConfigChange(config: BehaviorConfig, prev: BehaviorConfig): RebuildHint {
        this.config = config;
        if (
            config.enabled !== prev.enabled ||
            config.stopCount !== prev.stopCount
        ) {
            return "rebuild";
        }
        return "none";
    }

    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor {
        const opts = [...dataBinding, "options"];

        const isEnabled = () => this.config.enabled !== false;
        const hasStop = (n: number) => () =>
            isEnabled() &&
            (this.config.stopCount ?? GradientBehavior.defaults.stopCount) >= n;

        return {
            type: "folder",
            label: GradientBehavior.label,
            children: {
                enabled: {
                    type: "checkbox",
                    label: "Enabled",
                    value: [...opts, "enabled"],
                },
                stopCount: {
                    type: "select",
                    label: "Stops",
                    value: [...opts, "stopCount"],
                    items: [
                        { id: 2, label: "2" },
                        { id: 3, label: "3" },
                        { id: 4, label: "4" },
                    ],
                    mode: "buttons",
                    visible: isEnabled,
                },

                // ── Stop 0 ──
                color0: {
                    type: "color",
                    label: "Color 1",
                    value: [...opts, "color0"],
                    visible: isEnabled,
                },
                alpha0: {
                    type: "number",
                    label: "Alpha 1",
                    value: [...opts, "alpha0"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                    visible: isEnabled,
                },
                pos0: {
                    type: "number",
                    label: "Position 1",
                    value: [...opts, "pos0"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                    visible: isEnabled,
                },

                // ── Stop 1 ──
                color1: {
                    type: "color",
                    label: "Color 2",
                    value: [...opts, "color1"],
                    visible: isEnabled,
                },
                alpha1: {
                    type: "number",
                    label: "Alpha 2",
                    value: [...opts, "alpha1"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                    visible: isEnabled,
                },
                pos1: {
                    type: "number",
                    label: "Position 2",
                    value: [...opts, "pos1"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                    visible: isEnabled,
                },

                // ── Stop 2 ──
                color2: {
                    type: "color",
                    label: "Color 3",
                    value: [...opts, "color2"],
                    visible: hasStop(3),
                },
                alpha2: {
                    type: "number",
                    label: "Alpha 3",
                    value: [...opts, "alpha2"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                    visible: hasStop(3),
                },
                pos2: {
                    type: "number",
                    label: "Position 3",
                    value: [...opts, "pos2"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                    visible: hasStop(3),
                },

                // ── Stop 3 ──
                color3: {
                    type: "color",
                    label: "Color 4",
                    value: [...opts, "color3"],
                    visible: hasStop(4),
                },
                alpha3: {
                    type: "number",
                    label: "Alpha 4",
                    value: [...opts, "alpha3"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                    visible: hasStop(4),
                },
                pos3: {
                    type: "number",
                    label: "Position 4",
                    value: [...opts, "pos3"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                    visible: hasStop(4),
                },
            },
        };
    }

    dispose() {
        this.plugin = null;
    }
}
