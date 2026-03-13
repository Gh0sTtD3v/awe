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
import { curl_noise } from "../shader-lib";

export class FbmNoiseBehavior implements ParticleBehavior {
    static behaviorName = "fbmNoise";
    static label = "FBM Noise";
    static defaults: BehaviorConfig = {
        fbmEnabled: true,
        fbmPower: 1.0,
        fbmDomain: 0.1,
        fbmSpeed: 0.1,
        fbmSpeedVariation: 0.1,
        fbmOctaves: 2,
        fbmLacunarity: 2.0,
        fbmPersistence: 0.5,
    };

    private plugin: any = null;

    constructor(
        private host: ParticlesComponent,
        private config: BehaviorConfig
    ) {}

    getPlugin(): any | null {
        const cfg = this.config;

        if (!cfg.fbmEnabled) {
            this.plugin = null;
            return null;
        }

        const octaves = Math.max(
            1,
            Math.min(
                4,
                Math.round(
                    cfg.fbmOctaves ?? FbmNoiseBehavior.defaults.fbmOctaves
                )
            )
        );

        const plugin: any = {
            name: "ParticleFbmNoisePlugin",
            uniforms: {
                fbmPower: {
                    value:
                        cfg.fbmPower ?? FbmNoiseBehavior.defaults.fbmPower,
                },
                fbmDomain: {
                    value:
                        cfg.fbmDomain ?? FbmNoiseBehavior.defaults.fbmDomain,
                },
                fbmSpeed: {
                    value:
                        cfg.fbmSpeed ?? FbmNoiseBehavior.defaults.fbmSpeed,
                },
                fbmSpeedVariation: {
                    value:
                        cfg.fbmSpeedVariation ??
                        FbmNoiseBehavior.defaults.fbmSpeedVariation,
                },
                fbmLacunarity: {
                    value:
                        cfg.fbmLacunarity ??
                        FbmNoiseBehavior.defaults.fbmLacunarity,
                },
                fbmPersistence: {
                    value:
                        cfg.fbmPersistence ??
                        FbmNoiseBehavior.defaults.fbmPersistence,
                },
            },
            vertexShaderHooks: {
                prefix:
                    curl_noise +
                    `
                    uniform float fbmPower;
                    uniform float fbmDomain;
                    uniform float fbmSpeed;
                    uniform float fbmSpeedVariation;
                    uniform float fbmLacunarity;
                    uniform float fbmPersistence;
                `,
                main: `
                    {
                        float noiseScale = fbmDomain;
                        float fbmTimer = pluginTimer * (fbmSpeed + fbmSpeedVariation * nrand(vec2(randomID) * 40.0));

                        vec3 curlAccum = vec3(0.0);
                        float freq = 1.0;
                        float amp  = 1.0;

                        for (int i = 0; i < FBM_OCTAVES; i++) {
                            vec3 p = (offset + vec3(fbmTimer)) * noiseScale * freq;
                            vec3 pX = p;
                            vec3 pY = p + vec3(31.341, -43.23, 12.34);
                            vec3 pZ = p + vec3(-231.341, 124.23, -54.34);

                            vec3 derivX = SimplexPerlin3D_Deriv(pX);
                            vec3 derivY = SimplexPerlin3D_Deriv(pY);
                            vec3 derivZ = SimplexPerlin3D_Deriv(pZ);

                            vec3 curl = vec3(
                                derivZ.y - derivY.z,
                                derivX.z - derivZ.x,
                                derivY.x - derivX.y
                            );

                            curlAccum += curl * amp;
                            freq *= fbmLacunarity;
                            amp  *= fbmPersistence;
                        }

                        particlePosition += curlAccum * fbmPower;
                    }
                `,
                suffix: ``,
            },
            defines: [{ name: "FBM_OCTAVES", value: String(octaves) }],
        };

        this.plugin = plugin;
        return plugin;
    }

    onFrame(_delta: number): void {
        if (this.plugin?.uniforms.fbmPower != null && this.config.fbmEnabled) {
            this.plugin.uniforms.fbmPower.value =
                this.config.fbmPower ?? FbmNoiseBehavior.defaults.fbmPower;
            this.plugin.uniforms.fbmDomain.value =
                this.config.fbmDomain ?? FbmNoiseBehavior.defaults.fbmDomain;
            this.plugin.uniforms.fbmSpeed.value =
                this.config.fbmSpeed ?? FbmNoiseBehavior.defaults.fbmSpeed;
            this.plugin.uniforms.fbmSpeedVariation.value =
                this.config.fbmSpeedVariation ??
                FbmNoiseBehavior.defaults.fbmSpeedVariation;
            this.plugin.uniforms.fbmLacunarity.value =
                this.config.fbmLacunarity ??
                FbmNoiseBehavior.defaults.fbmLacunarity;
            this.plugin.uniforms.fbmPersistence.value =
                this.config.fbmPersistence ??
                FbmNoiseBehavior.defaults.fbmPersistence;
        }
    }

    onConfigChange(config: BehaviorConfig, prev: BehaviorConfig): RebuildHint {
        this.config = config;
        if (
            config.fbmEnabled !== prev.fbmEnabled ||
            config.fbmOctaves !== prev.fbmOctaves
        ) {
            return "rebuild";
        }
        return "none";
    }

    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor {
        const opts = [...dataBinding, "options"];
        const isEnabled = () => this.config.fbmEnabled === true;

        return {
            type: "folder",
            label: FbmNoiseBehavior.label,
            children: {
                fbmEnabled: {
                    type: "checkbox",
                    label: "Enabled",
                    value: [...opts, "fbmEnabled"],
                },
                fbmPower: {
                    type: "number",
                    label: "Power",
                    value: [...opts, "fbmPower"],
                    step: 0.01,
                    min: 0,
                    max: 2,
                    visible: isEnabled,
                },
                fbmDomain: {
                    type: "number",
                    label: "Domain",
                    value: [...opts, "fbmDomain"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                    visible: isEnabled,
                },
                fbmSpeed: {
                    type: "number",
                    label: "Speed",
                    value: [...opts, "fbmSpeed"],
                    step: 0.01,
                    min: 0,
                    max: 5,
                    visible: isEnabled,
                },
                fbmSpeedVariation: {
                    type: "number",
                    label: "Speed Variation",
                    value: [...opts, "fbmSpeedVariation"],
                    step: 0.01,
                    min: 0,
                    max: 5,
                    visible: isEnabled,
                },
                fbmOctaves: {
                    type: "number",
                    label: "Octaves",
                    value: [...opts, "fbmOctaves"],
                    step: 1,
                    min: 1,
                    max: 4,
                    visible: isEnabled,
                },
                fbmLacunarity: {
                    type: "number",
                    label: "Lacunarity",
                    value: [...opts, "fbmLacunarity"],
                    step: 0.1,
                    min: 1,
                    max: 4,
                    visible: isEnabled,
                },
                fbmPersistence: {
                    type: "number",
                    label: "Persistence",
                    value: [...opts, "fbmPersistence"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                    visible: isEnabled,
                },
            },
        };
    }

    dispose() {
        this.plugin = null;
    }
}
