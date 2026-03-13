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

export class FlipbookBehavior implements ParticleBehavior {
    static behaviorName = "flipbook";
    static label = "Flipbook Animation";
    static defaults: BehaviorConfig = {
        enabled: true,
        totalFrames: 16,
        loop: false,
        loopCount: 1,
        randomStartFrame: false,
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

        const totalFrames = cfg.totalFrames ?? FlipbookBehavior.defaults.totalFrames;
        const loopCount = cfg.loop
            ? (cfg.loopCount ?? FlipbookBehavior.defaults.loopCount)
            : 1;

        const plugin: any = {
            name: "ParticleFlipbookPlugin",
            uniforms: {
                flipbookTotalFrames: { value: totalFrames },
                flipbookLoopCount: { value: loopCount },
            },
            attributes: {
                flipbookOffset: {
                    name: "flipbookOffset",
                    array: [],
                    length: 1,
                    defaultValue: 0,
                },
            },
            vertexShaderHooks: {
                prefix: `
                    #ifdef FLIPBOOK
                        uniform float flipbookTotalFrames;
                        uniform float flipbookLoopCount;
                        attribute float flipbookOffset;
                    #endif
                `,
                main: ``,
                suffix: `
                    #if defined(FLIPBOOK) && defined(ATLAS) && defined(USE_MAP)
                        float fbLife = vLife * flipbookLoopCount;
                        float fbT = fract(fbLife) + flipbookOffset;
                        fbT = fract(fbT);

                        float fbFrame = floor(fbT * flipbookTotalFrames);
                        fbFrame = min(fbFrame, flipbookTotalFrames - 1.0);

                        float fbCols = atlas.z > 0.0 ? (1.0 / atlas.z) : 1.0;
                        float fbRows = atlas.w > 0.0 ? (1.0 / atlas.w) : 1.0;

                        float fbCol = mod(fbFrame, fbCols);
                        float fbRow = floor(fbFrame / fbCols);

                        vec2 fbCellSize = vec2(atlas.z, atlas.w);
                        vec2 fbOffset = vec2(fbCol * atlas.z, fbRow * atlas.w);

                        vMapUv = fbOffset + fbCellSize * particleUV;
                    #endif
                `,
            },
            defines: {
                FLIPBOOK: "",
            } as any,
        };

        this.plugin = plugin;
        return plugin;
    }

    getGeometryOptions(): Record<string, any> | null {
        if (!this.config.enabled) return null;
        return { atlas: true };
    }

    applySpawnData(data: ParticleSpawnData, _context: SpawnContext): void {
        const cfg = this.config;
        if (!cfg.enabled) return;
        if (cfg.randomStartFrame) {
            const totalFrames = cfg.totalFrames ?? FlipbookBehavior.defaults.totalFrames;
            data.flipbookOffset = Math.floor(Math.random() * totalFrames) / totalFrames;
        } else {
            data.flipbookOffset = 0;
        }
    }

    onFrame(_delta: number): void {
        if (!this.plugin || !this.config.enabled) return;

        const cfg = this.config;
        const d = FlipbookBehavior.defaults;
        const u = this.plugin.uniforms;

        u.flipbookTotalFrames.value = cfg.totalFrames ?? d.totalFrames;
        u.flipbookLoopCount.value = cfg.loop
            ? (cfg.loopCount ?? d.loopCount)
            : 1;
    }

    onConfigChange(config: BehaviorConfig, prev: BehaviorConfig): RebuildHint {
        this.config = config;
        if (
            config.enabled !== prev.enabled ||
            config.randomStartFrame !== prev.randomStartFrame
        ) {
            return "rebuild";
        }
        return "none";
    }

    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor {
        const opts = [...dataBinding, "options"];

        const isEnabled = () => this.config.enabled !== false;
        const isLoop = () => isEnabled() && this.config.loop === true;

        return {
            type: "folder",
            label: FlipbookBehavior.label,
            children: {
                enabled: {
                    type: "checkbox",
                    label: "Enabled",
                    value: [...opts, "enabled"],
                },
                totalFrames: {
                    type: "number",
                    label: "Total Frames",
                    value: [...opts, "totalFrames"],
                    step: 1,
                    min: 1,
                    max: 256,
                    visible: isEnabled,
                },
                loop: {
                    type: "checkbox",
                    label: "Loop",
                    value: [...opts, "loop"],
                    visible: isEnabled,
                },
                loopCount: {
                    type: "number",
                    label: "Loop Count",
                    value: [...opts, "loopCount"],
                    step: 1,
                    min: 1,
                    max: 20,
                    visible: isLoop,
                },
                randomStartFrame: {
                    type: "checkbox",
                    label: "Random Start Frame",
                    value: [...opts, "randomStartFrame"],
                    visible: isEnabled,
                },
            },
        };
    }

    dispose() {
        this.plugin = null;
    }
}
