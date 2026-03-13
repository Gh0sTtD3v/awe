import { Vector3 } from "three";
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

export class ForcesBehavior implements ParticleBehavior {
    static behaviorName = "forces";
    static label = "Forces";
    static defaults: BehaviorConfig = {
        // Velocity (absorbed from DirectionBehavior)
        initialVelocity: { x: 0, y: 1, z: 0 },
        initialVelocityRange: { x: 0, y: 0, z: 0 },
        followSourceDirection: false,
        followSourceVelocityScale: 1,
        // Forces
        gravity: { x: 0, y: -9.8, z: 0 },
        wind: { x: 0, y: 0, z: 0 },
        drag: 0,
    };

    private plugin: any = null;
    private _currentFrame = -1;
    private _tempVec = new Vector3();

    constructor(
        private host: ParticlesComponent,
        private config: BehaviorConfig
    ) {}

    getPlugin(): any {
        const cfg = this.config;
        const velocity =
            cfg.initialVelocity ?? ForcesBehavior.defaults.initialVelocity;
        const velocityRange =
            cfg.initialVelocityRange ?? ForcesBehavior.defaults.initialVelocityRange;
        const gravity = cfg.gravity ?? ForcesBehavior.defaults.gravity;
        const wind = cfg.wind ?? ForcesBehavior.defaults.wind;
        const drag = cfg.drag ?? ForcesBehavior.defaults.drag;

        const followSource = !!cfg.followSourceDirection;

        const plugin: any = {
            name: "ParticleForcesPlugin",
            uniforms: {
                initialVelocity: { value: velocity },
                initialVelocityRange: { value: velocityRange },
                forcesGravity: { value: gravity },
                forcesWind: { value: wind },
                forcesDrag: { value: drag },
            },
            vertexShaderHooks: {
                prefix: `
                    uniform vec3 initialVelocity;
                    uniform vec3 initialVelocityRange;
                    uniform vec3 forcesGravity;
                    uniform vec3 forcesWind;
                    uniform float forcesDrag;
                    ${followSource ? "attribute vec3 sourceDirection;" : ""}
                `,
                main: `
                    ${followSource ? "particlePosition += sourceDirection * vTimerDiff;" : ""}

                    particlePosition += initialVelocity * vTimerDiff;

                    ${
                        followSource
                            ? `
                    particlePosition.x += nrand( vec2(randomID) * 10.0  + 43.2 ) * initialVelocityRange.x * vTimerDiff;
                    particlePosition.y += nrand( vec2(randomID) * 20.0 - 12.3  ) * initialVelocityRange.y * vTimerDiff;
                    particlePosition.z += nrand( vec2(randomID) * 1.0  + 57.3  ) * initialVelocityRange.z * vTimerDiff;
                    `
                            : `
                    particlePosition.x += nrand( vec2(randomID) * 10.0  + 43.2 ) * initialVelocityRange.x;
                    particlePosition.y += nrand( vec2(randomID) * 20.0 - 12.3  ) * initialVelocityRange.y;
                    particlePosition.z += nrand( vec2(randomID) * 1.0  + 57.3  ) * initialVelocityRange.z;
                    `
                    }

                    vec3 forcesAccel = forcesGravity + forcesWind;
                    float t = vTimerDiff;

                    if (forcesDrag > 0.001) {
                        float eDrag = forcesDrag;
                        float expTerm = 1.0 - exp(-eDrag * t);
                        float dampedT = expTerm / eDrag;
                        particlePosition += forcesAccel * (t - dampedT) / eDrag;
                    } else {
                        particlePosition += 0.5 * forcesAccel * t * t;
                    }
                `,
                suffix: ``,
            },
            defines: [] as any,
        };

        if (followSource) {
            plugin.attributes = {
                sourceDirection: {
                    name: "sourceDirection",
                    array: [],
                    length: 3,
                    defaultValue: [0, 0, 0],
                },
            };
        }

        this.plugin = plugin;
        return plugin;
    }

    applySpawnData(data: ParticleSpawnData, _context: SpawnContext): void {
        const cfg = this.config;
        if (this.host.data.source != null && cfg.followSourceDirection) {
            // Process source orientation only once per frame
            if (data.frame !== this._currentFrame) {
                const e = this.host.data.source.matrixWorld.elements;
                this._tempVec.set(e[8], e[9], e[10]).normalize();
                this._currentFrame = data.frame;
            }

            const force =
                cfg.followSourceVelocityScale ??
                ForcesBehavior.defaults.followSourceVelocityScale;

            data.sourceDirection = [
                -this._tempVec.x * force,
                -this._tempVec.y * force,
                -this._tempVec.z * force,
            ];
        }
    }

    onFrame(_delta: number): void {
        if (!this.plugin) return;
        const cfg = this.config;
        const u = this.plugin.uniforms;
        u.initialVelocity.value =
            cfg.initialVelocity ?? ForcesBehavior.defaults.initialVelocity;
        u.initialVelocityRange.value =
            cfg.initialVelocityRange ?? ForcesBehavior.defaults.initialVelocityRange;
        u.forcesGravity.value = cfg.gravity ?? ForcesBehavior.defaults.gravity;
        u.forcesWind.value = cfg.wind ?? ForcesBehavior.defaults.wind;
        u.forcesDrag.value = cfg.drag ?? ForcesBehavior.defaults.drag;
    }

    onConfigChange(config: BehaviorConfig, prev: BehaviorConfig): RebuildHint {
        this.config = config;
        if (config.followSourceDirection !== prev.followSourceDirection) {
            return "rebuild";
        }
        return "none";
    }

    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor {
        const opts = [...dataBinding, "options"];
        const hasSource = () => this.host.data.source != null;
        const hasSourceAndFollow = () =>
            hasSource() && this.config.followSourceDirection === true;

        return {
            type: "folder",
            label: ForcesBehavior.label,
            children: {
                initialVelocity: {
                    type: "xyz",
                    label: "Initial Velocity",
                    value: [...opts, "initialVelocity"],
                    step: 0.01,
                },
                initialVelocityRange: {
                    type: "xyz",
                    label: "Velocity Randomness",
                    value: [...opts, "initialVelocityRange"],
                    step: 0.01,
                },
                followSourceDirection: {
                    type: "checkbox",
                    label: "Follow Source Direction",
                    value: [...opts, "followSourceDirection"],
                    visible: hasSource,
                },
                followSourceVelocityScale: {
                    type: "number",
                    label: "Follow Source Velocity Scale",
                    value: [...opts, "followSourceVelocityScale"],
                    min: -50,
                    max: 50,
                    visible: hasSourceAndFollow,
                },
                gravity: {
                    type: "xyz",
                    label: "Gravity",
                    value: [...opts, "gravity"],
                    step: 0.1,
                    min: -50,
                    max: 50,
                },
                wind: {
                    type: "xyz",
                    label: "Wind",
                    value: [...opts, "wind"],
                    step: 0.1,
                    min: -50,
                    max: 50,
                },
                drag: {
                    type: "number",
                    label: "Drag",
                    value: [...opts, "drag"],
                    step: 0.01,
                    min: 0,
                    max: 10,
                },
            },
        };
    }

    dispose() {
        this.plugin = null;
    }
}
