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

/**
 * Depth-buffer collision behavior for particles.
 *
 * Supports two modes:
 * - **ground**: Simple Y-plane clamp — no external dependencies.
 * - **depth**: Compares particle depth against the scene depth buffer
 *   and pushes particles forward to the collision surface.
 *
 * **Ordering**: This behavior should be placed *after* behaviors that move
 * `particlePosition` (forces, noise, fbm-noise, spawn-position) so the
 * collision clamp sees the final position.
 */
export class DepthCollisionBehavior implements ParticleBehavior {
    static behaviorName = "depthCollision";
    static label = "Depth Collision";
    static defaults: BehaviorConfig = {
        mode: "ground",
        groundY: 0.0,
        bounce: 0.0,
        cameraNear: 0.1,
        cameraFar: 1000.0,
        offset: 0.0,
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
        const mode = cfg.mode ?? DepthCollisionBehavior.defaults.mode;

        if (mode === "ground") {
            return this._buildGroundPlugin(cfg);
        } else {
            return this._buildDepthPlugin(cfg);
        }
    }

    setupMaterial(_mesh: any): void {
        if (!this.plugin) return;
        const mode = this.config.mode ?? DepthCollisionBehavior.defaults.mode;
        if (mode !== "depth") return;

        // Re-acquire depth texture if not yet available
        if (!this.depthTexture) {
            this._acquireDepthTexture();
            if (this.depthTexture && this.plugin) {
                this.plugin.uniforms.dcDepthTexture.value =
                    this.depthTexture;
            }
        }

        // Bind resolution from shared globals
        try {
            const SHARED = (this.host as any).container?.space?.shared;
            if (SHARED?.resolution?.value) {
                this.plugin.uniforms.dcResolution.value =
                    SHARED.resolution.value;
            }
        } catch {
            // fallback: resolution will be updated in onFrame
        }
    }

    onFrame(_delta: number): void {
        if (!this.plugin) return;
        const cfg = this.config;
        const d = DepthCollisionBehavior.defaults;
        const mode = cfg.mode ?? d.mode;

        if (mode === "ground") {
            this.plugin.uniforms.dcGroundY.value =
                cfg.groundY ?? d.groundY;
            this.plugin.uniforms.dcBounce.value =
                cfg.bounce ?? d.bounce;
            this.plugin.uniforms.dcOffset.value =
                cfg.offset ?? d.offset;
        } else {
            this.plugin.uniforms.dcBounce.value =
                cfg.bounce ?? d.bounce;
            this.plugin.uniforms.dcOffset.value =
                cfg.offset ?? d.offset;

            // Sync camera near/far from live camera if accessible
            try {
                const camera = (this.host as any).container?.space?.camera;
                if (camera) {
                    this.plugin.uniforms.dcCameraNear.value =
                        camera.near ?? d.cameraNear;
                    this.plugin.uniforms.dcCameraFar.value =
                        camera.far ?? d.cameraFar;
                }
            } catch {
                // Use fallback defaults
            }
        }
    }

    onConfigChange(
        config: BehaviorConfig,
        prev: BehaviorConfig
    ): RebuildHint {
        this.config = config;
        // Mode change requires shader rebuild (different defines/uniforms)
        if (config.mode !== prev.mode) {
            return "rebuild";
        }
        return "none";
    }

    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor {
        const opts = [...dataBinding, "options"];
        const isGround = () =>
            (this.config.mode ?? "ground") === "ground";

        return {
            type: "folder",
            label: DepthCollisionBehavior.label,
            children: {
                mode: {
                    type: "select",
                    label: "Mode",
                    value: [...opts, "mode"],
                    items: [
                        { id: "ground", label: "Ground Plane" },
                        { id: "depth", label: "Depth Buffer" },
                    ],
                },
                groundY: {
                    type: "number",
                    label: "Ground Y",
                    value: [...opts, "groundY"],
                    step: 0.1,
                    min: -100,
                    max: 100,
                    visible: isGround,
                    info: "World-space Y coordinate of the collision plane",
                },
                bounce: {
                    type: "number",
                    label: "Bounce",
                    value: [...opts, "bounce"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                    info: "0 = hard clamp, 1 = full elastic reflection",
                },
                offset: {
                    type: "number",
                    label: "Surface Offset",
                    value: [...opts, "offset"],
                    step: 0.01,
                    min: 0,
                    max: 5,
                    info: "Extra distance from collision surface to prevent z-fighting",
                },
            },
        };
    }

    dispose(): void {
        this.plugin = null;
        this.depthTexture = null;
    }

    // ── Private ──

    private _buildGroundPlugin(cfg: BehaviorConfig): any {
        const plugin: any = {
            name: "ParticleDepthCollisionPlugin",
            uniforms: {
                dcGroundY: {
                    value:
                        cfg.groundY ??
                        DepthCollisionBehavior.defaults.groundY,
                },
                dcBounce: {
                    value:
                        cfg.bounce ??
                        DepthCollisionBehavior.defaults.bounce,
                },
                dcOffset: {
                    value:
                        cfg.offset ??
                        DepthCollisionBehavior.defaults.offset,
                },
            },
            vertexShaderHooks: {
                prefix: `
                    uniform float dcGroundY;
                    uniform float dcBounce;
                    uniform float dcOffset;
                `,
                main: `
                    // Ground-plane collision
                    float dcSurface = dcGroundY + dcOffset;
                    if (particlePosition.y < dcSurface) {
                        if (dcBounce > 0.001) {
                            // Reflect: mirror the penetration distance
                            float dcPenetration = dcSurface - particlePosition.y;
                            particlePosition.y = dcSurface + dcPenetration * dcBounce;
                        } else {
                            // Hard clamp
                            particlePosition.y = dcSurface;
                        }
                    }
                `,
                suffix: ``,
            },
            defines: {} as any,
        };

        plugin.defines["DC_GROUND"] = "";
        this.plugin = plugin;
        return plugin;
    }

    private _buildDepthPlugin(cfg: BehaviorConfig): any {
        const hasDepth = this.depthTexture != null;

        const plugin: any = {
            name: "ParticleDepthCollisionPlugin",
            uniforms: {
                dcBounce: {
                    value:
                        cfg.bounce ??
                        DepthCollisionBehavior.defaults.bounce,
                },
                dcOffset: {
                    value:
                        cfg.offset ??
                        DepthCollisionBehavior.defaults.offset,
                },
                dcCameraNear: {
                    value:
                        cfg.cameraNear ??
                        DepthCollisionBehavior.defaults.cameraNear,
                },
                dcCameraFar: {
                    value:
                        cfg.cameraFar ??
                        DepthCollisionBehavior.defaults.cameraFar,
                },
                dcDepthTexture: {
                    value: this.depthTexture,
                },
                dcResolution: {
                    value: { x: 1, y: 1 },
                },
            },
            vertexShaderHooks: {
                prefix: `
                    #ifdef DC_DEPTH
                        uniform float dcBounce;
                        uniform float dcOffset;
                        uniform float dcCameraNear;
                        uniform float dcCameraFar;
                        uniform sampler2D dcDepthTexture;
                        uniform vec2 dcResolution;

                        float dcPerspectiveDepthToViewZ(float depth, float near, float far) {
                            return (near * far) / ((far - near) * depth - far);
                        }
                    #endif
                `,
                main: ``,
                suffix: `
                    #ifdef DC_DEPTH
                        // After mvPosition is computed, project to screen
                        vec4 dcClipPos = projectionMatrix * mvPosition;
                        vec2 dcNDC = dcClipPos.xy / dcClipPos.w;
                        vec2 dcScreenUV = dcNDC * 0.5 + 0.5;

                        float dcSceneDepthRaw = texture2D(dcDepthTexture, dcScreenUV).r;
                        float dcSceneViewZ = dcPerspectiveDepthToViewZ(dcSceneDepthRaw, dcCameraNear, dcCameraFar);
                        float dcFragViewZ = mvPosition.z;

                        // Particle is behind scene surface when fragViewZ < sceneViewZ (both negative in view space)
                        float dcDepthDiff = dcSceneViewZ - dcFragViewZ;
                        if (dcDepthDiff > 0.0) {
                            // Push particle forward to surface + offset
                            float dcCorrection = dcDepthDiff + dcOffset;
                            if (dcBounce > 0.001) {
                                mvPosition.z = dcSceneViewZ + dcCorrection * dcBounce;
                            } else {
                                mvPosition.z = dcSceneViewZ + dcOffset;
                            }
                        }
                    #endif
                `,
            },
            fragmentShaderHooks: {
                prefix: ``,
                main: ``,
                suffix: ``,
            },
            defines: {} as any,
        };

        if (hasDepth) {
            plugin.defines["DC_DEPTH"] = "";
        }

        this.plugin = plugin;
        return plugin;
    }

    private _acquireDepthTexture(): void {
        try {
            const postProcessing = (globalThis as any).__postProcessing;
            if (postProcessing?.target?.depthTexture) {
                this.depthTexture = postProcessing.target.depthTexture;
            }
        } catch {
            this.depthTexture = null;
        }
    }
}
