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

export class NoiseBehavior implements ParticleBehavior {
    static behaviorName = "noise";
    static label = "Noise";
    static defaults: BehaviorConfig = {
        curlEnabled: true,
        curlPower: 1.0,
        curlDomain: 0.1,
        curlSpeed: 0.1,
        curlSpeedVariation: 0.1,
    };

    private plugin: any = null;

    constructor(
        private host: ParticlesComponent,
        private config: BehaviorConfig
    ) {}

    getPlugin(): any | null {
        const cfg = this.config;

        if (!cfg.curlEnabled) {
            this.plugin = null;
            return null;
        }

        const plugin: any = {
            name: "ParticleNoisePlugin",
            uniforms: {
                curlPower: { value: cfg.curlPower ?? NoiseBehavior.defaults.curlPower },
                curlDomain: { value: cfg.curlDomain ?? NoiseBehavior.defaults.curlDomain },
                curlSpeed: { value: cfg.curlSpeed ?? NoiseBehavior.defaults.curlSpeed },
                curlSpeedVariation: {
                    value: cfg.curlSpeedVariation ?? NoiseBehavior.defaults.curlSpeedVariation,
                },
            },
            vertexShaderHooks: {
                prefix:
                    curl_noise +
                    `
                    uniform float curlPower;
                    uniform float curlDomain;
                    uniform float curlSpeed;
                    uniform float curlSpeedVariation;
                `,
                main: `
                    float noiseScale = curlDomain;

                    float curlTimer = (pluginTimer * (curlSpeed + curlSpeedVariation * nrand( vec2(randomID) * 40.0 ) ) ) ;
                    vec3 posX = (offset + vec3(curlTimer) * noiseScale );
                    vec3 posY = posX + vec3(31.341, -43.23, 12.34f);
                    vec3 posZ = posX + vec3(-231.341, 124.23, -54.34);
                    vec3 derivX = SimplexPerlin3D_Deriv(posX);
                    vec3 derivY = SimplexPerlin3D_Deriv(posY);
                    vec3 derivZ = SimplexPerlin3D_Deriv(posZ);
                    vec3 curlDir = vec3(derivZ.y - derivY.z, derivX.z - derivZ.x, derivY.x - derivX.y);

                    particlePosition += curlDir * curlPower;
                `,
                suffix: ``,
            },
            defines: [] as any,
        };

        this.plugin = plugin;
        return plugin;
    }

    onFrame(_delta: number): void {
        if (this.plugin?.uniforms.curlPower != null && this.config.curlEnabled) {
            this.plugin.uniforms.curlPower.value =
                this.config.curlPower ?? NoiseBehavior.defaults.curlPower;
            this.plugin.uniforms.curlDomain.value =
                this.config.curlDomain ?? NoiseBehavior.defaults.curlDomain;
            this.plugin.uniforms.curlSpeed.value =
                this.config.curlSpeed ?? NoiseBehavior.defaults.curlSpeed;
            this.plugin.uniforms.curlSpeedVariation.value =
                this.config.curlSpeedVariation ?? NoiseBehavior.defaults.curlSpeedVariation;
        }
    }

    onConfigChange(config: BehaviorConfig, prev: BehaviorConfig): RebuildHint {
        this.config = config;
        if (config.curlEnabled !== prev.curlEnabled) {
            return "rebuild";
        }
        return "none";
    }

    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor {
        const opts = [...dataBinding, "options"];
        const isCurlEnabled = () => this.config.curlEnabled === true;

        return {
            type: "folder",
            label: NoiseBehavior.label,
            children: {
                curlEnabled: {
                    type: "checkbox",
                    label: "Curl Enabled",
                    value: [...opts, "curlEnabled"],
                },
                curlPower: {
                    type: "number",
                    label: "Curl Power",
                    value: [...opts, "curlPower"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                    visible: isCurlEnabled,
                },
                curlDomain: {
                    type: "number",
                    label: "Curl Domain",
                    value: [...opts, "curlDomain"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                    visible: isCurlEnabled,
                },
                curlSpeed: {
                    type: "number",
                    label: "Curl Speed",
                    value: [...opts, "curlSpeed"],
                    step: 0.01,
                    min: 0,
                    max: 5,
                    visible: isCurlEnabled,
                },
                curlSpeedVariation: {
                    type: "number",
                    label: "Curl Speed Variation",
                    value: [...opts, "curlSpeedVariation"],
                    step: 0.01,
                    min: 0,
                    max: 5,
                    visible: isCurlEnabled,
                },
            },
        };
    }

    dispose() {
        this.plugin = null;
    }
}
