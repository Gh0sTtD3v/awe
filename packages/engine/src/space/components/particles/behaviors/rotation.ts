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

export class RotationBehavior implements ParticleBehavior {
    static behaviorName = "rotation";
    static label = "Rotation";
    static defaults: BehaviorConfig = {
        startingRotation: { x: 0, y: 0, z: 0 },
        randomRangeRotation: { x: 0, y: 0, z: 0 },
        rotationAxis: { x: 0, y: 1, z: 0 },
        billboardStartingRotation: 0,
        billboardRandomRangeRotation: 0,
        rotationSpeed: 1,
    };

    private plugin: any = null;

    constructor(
        private host: ParticlesComponent,
        private config: BehaviorConfig
    ) {}

    getPlugin(): any {
        const cfg = this.config;
        const plugin = {
            name: "ParticleRotationPlugin",
            uniforms: {
                urotationAxis: {
                    value: cfg.rotationAxis ?? RotationBehavior.defaults.rotationAxis,
                },
                urotationSpeed: {
                    value: cfg.rotationSpeed ?? RotationBehavior.defaults.rotationSpeed,
                },
            },
            vertexShaderHooks: {
                prefix: `
                    uniform vec3 urotationAxis;
                    uniform float urotationSpeed;
                `,
                main: `
                    rotationAxis += urotationAxis;
                    rotationSpeed += urotationSpeed;
                `,
                suffix: ``,
            },
            defines: [] as any,
        };

        this.plugin = plugin;
        return plugin;
    }

    applySpawnData(data: ParticleSpawnData, context: SpawnContext): void {
        const cfg = this.config;
        const billboard = context.billboard;

        if (billboard) {
            const startRot = cfg.billboardStartingRotation ??
                RotationBehavior.defaults.billboardStartingRotation;
            const randRange = cfg.billboardRandomRangeRotation ??
                RotationBehavior.defaults.billboardRandomRangeRotation;
            data.rotationY = startRot + Math.random() * randRange;
        } else {
            const startRot = cfg.startingRotation ?? RotationBehavior.defaults.startingRotation;
            const randRange = cfg.randomRangeRotation ?? RotationBehavior.defaults.randomRangeRotation;
            data.rotation.x =
                startRot.x + (Math.random() - Math.random()) * randRange.x;
            data.rotation.y =
                startRot.y + (Math.random() - Math.random()) * randRange.y;
            data.rotation.z =
                startRot.z + (Math.random() - Math.random()) * randRange.z;
        }
    }

    onFrame(_delta: number): void {
        if (this.plugin) {
            this.plugin.uniforms.urotationSpeed.value =
                this.config.rotationSpeed ?? RotationBehavior.defaults.rotationSpeed;
        }
    }

    onConfigChange(config: BehaviorConfig, prev: BehaviorConfig): RebuildHint {
        this.config = config;
        return "none";
    }

    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor {
        const opts = [...dataBinding, "options"];
        const isBillboard = () => this.host.data.billboard === true;
        const isNotBillboard = () => this.host.data.billboard === false;

        return {
            type: "folder",
            label: RotationBehavior.label,
            children: {
                startingRotation: {
                    type: "xyz",
                    label: "Starting Rotation",
                    value: [...opts, "startingRotation"],
                    step: 0.01,
                    visible: isNotBillboard,
                },
                randomRangeRotation: {
                    type: "xyz",
                    label: "Random Range Rotation",
                    value: [...opts, "randomRangeRotation"],
                    step: 0.01,
                    min: 0,
                    max: 3.1416,
                    visible: isNotBillboard,
                },
                rotationAxis: {
                    type: "xyz",
                    label: "Rotation Axis Over Time",
                    value: [...opts, "rotationAxis"],
                    step: 0.01,
                    min: 0,
                    max: 3.1416,
                    visible: isNotBillboard,
                },
                billboardStartingRotation: {
                    type: "number",
                    label: "Billboard Starting Rotation",
                    value: [...opts, "billboardStartingRotation"],
                    step: 0.01,
                    min: -3.1416,
                    max: 3.1416,
                    visible: isBillboard,
                },
                billboardRandomRangeRotation: {
                    type: "number",
                    label: "Billboard Random Range Rotation",
                    value: [...opts, "billboardRandomRangeRotation"],
                    step: 0.01,
                    min: -3.1416,
                    max: 3.1416,
                    visible: isBillboard,
                },
                rotationSpeed: {
                    type: "number",
                    label: "Rotation Speed",
                    value: [...opts, "rotationSpeed"],
                    step: 0.01,
                    min: -10,
                    max: 10,
                },
            },
        };
    }

    dispose() {
        this.plugin = null;
    }
}
