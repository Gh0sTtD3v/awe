import { Texture } from "three";
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

export class SoftParticlesBehavior implements ParticleBehavior {
    static behaviorName = "softParticles";
    static label = "Soft Particles";
    static defaults: BehaviorConfig = {
        enabled: true,
        fadeDistance: 1.0,
        cameraNear: 0.1,
        cameraFar: 1000.0,
    };

    private plugin: any = null;
    private depthTexture: Texture | null = null;

    constructor(
        private host: ParticlesComponent,
        private config: BehaviorConfig
    ) {}

    init(): void {
        this._acquireDepthTexture();
    }

    getPlugin(): any | null {
        const cfg = this.config;

        if (!cfg.enabled) {
            this.plugin = null;
            return null;
        }

        const hasDepth = this.depthTexture != null;

        const plugin: any = {
            name: "ParticleSoftPlugin",
            uniforms: {
                softFadeDistance: {
                    value:
                        cfg.fadeDistance ??
                        SoftParticlesBehavior.defaults.fadeDistance,
                },
                softCameraNear: {
                    value:
                        cfg.cameraNear ??
                        SoftParticlesBehavior.defaults.cameraNear,
                },
                softCameraFar: {
                    value:
                        cfg.cameraFar ??
                        SoftParticlesBehavior.defaults.cameraFar,
                },
                softDepthTexture: {
                    value: this.depthTexture,
                },
                softResolution: {
                    value: { x: 1, y: 1 },
                },
            },
            vertexShaderHooks: {
                prefix: `
                    #ifdef SOFT_PARTICLES
                        varying float vSoftViewZ;
                    #endif
                `,
                main: ``,
                suffix: `
                    #ifdef SOFT_PARTICLES
                        vSoftViewZ = mvPosition.z;
                    #endif
                `,
            },
            fragmentShaderHooks: {
                prefix: `
                    #ifdef SOFT_PARTICLES
                        uniform float softFadeDistance;
                        uniform float softCameraNear;
                        uniform float softCameraFar;
                        uniform sampler2D softDepthTexture;
                        uniform vec2 softResolution;
                        varying float vSoftViewZ;

                        float softPerspectiveDepthToViewZ(float depth, float near, float far) {
                            return (near * far) / ((far - near) * depth - far);
                        }
                    #endif
                `,
                main: ``,
                suffix: `
                    #ifdef SOFT_PARTICLES
                        vec2 softScreenUV = gl_FragCoord.xy / softResolution;
                        float softSceneDepthRaw = texture2D(softDepthTexture, softScreenUV).r;

                        float softSceneViewZ = softPerspectiveDepthToViewZ(softSceneDepthRaw, softCameraNear, softCameraFar);

                        float softFragViewZ = vSoftViewZ;

                        float softDepthDiff = softSceneViewZ - softFragViewZ;

                        float softFade = clamp(softDepthDiff / softFadeDistance, 0.0, 1.0);

                        gl_FragColor.a *= softFade;
                    #endif
                `,
            },
            defines: {} as any,
        };

        if (hasDepth) {
            plugin.defines["SOFT_PARTICLES"] = "";
        }

        this.plugin = plugin;
        return plugin;
    }

    setupMaterial(_mesh: any): void {
        if (!this.plugin || !this.config.enabled) return;

        // Re-acquire in case it became available after init
        if (!this.depthTexture) {
            this._acquireDepthTexture();
            if (this.depthTexture && this.plugin) {
                this.plugin.uniforms.softDepthTexture.value =
                    this.depthTexture;
            }
        }

        // Update resolution from shared globals
        try {
            const SHARED = (this.host as any).container?.space?.shared;
            if (SHARED?.resolution?.value) {
                this.plugin.uniforms.softResolution.value =
                    SHARED.resolution.value;
            }
        } catch {
            // fallback: resolution will be updated in onFrame
        }
    }

    onFrame(_delta: number): void {
        if (!this.plugin || !this.config.enabled) return;

        const cfg = this.config;
        const d = SoftParticlesBehavior.defaults;

        this.plugin.uniforms.softFadeDistance.value =
            cfg.fadeDistance ?? d.fadeDistance;

        // Update camera near/far if camera is accessible
        try {
            const camera = (this.host as any).container?.space?.camera;
            if (camera) {
                this.plugin.uniforms.softCameraNear.value =
                    camera.near ?? d.cameraNear;
                this.plugin.uniforms.softCameraFar.value =
                    camera.far ?? d.cameraFar;
            }
        } catch {
            // Use fallback defaults
        }
    }

    onConfigChange(config: BehaviorConfig, prev: BehaviorConfig): RebuildHint {
        this.config = config;
        if (config.enabled !== prev.enabled) {
            return "rebuild";
        }
        return "none";
    }

    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor {
        const opts = [...dataBinding, "options"];
        const isEnabled = () => this.config.enabled === true;

        return {
            type: "folder",
            label: SoftParticlesBehavior.label,
            children: {
                enabled: {
                    type: "checkbox",
                    label: "Enabled",
                    value: [...opts, "enabled"],
                },
                fadeDistance: {
                    type: "number",
                    label: "Fade Distance",
                    value: [...opts, "fadeDistance"],
                    step: 0.01,
                    min: 0.01,
                    max: 10,
                    visible: isEnabled,
                    info: "World-space distance over which particles fade near geometry",
                },
            },
        };
    }

    dispose(): void {
        this.plugin = null;
        this.depthTexture = null;
    }

    // ── Private ──

    private _acquireDepthTexture(): void {
        // Try to obtain the depth texture from the postprocessing render target.
        // Currently the depth texture is commented out in postprocessing/index.js.
        // When it's enabled, this will work automatically.
        try {
            const postProcessing = (globalThis as any).__postProcessing;
            if (postProcessing?.target?.depthTexture) {
                this.depthTexture = postProcessing.target.depthTexture;
            }
        } catch {
            // Not available — soft particles will be inactive
            this.depthTexture = null;
        }
    }
}
