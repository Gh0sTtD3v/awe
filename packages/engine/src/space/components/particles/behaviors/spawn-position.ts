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

export class SpawnPositionBehavior implements ParticleBehavior {
    static behaviorName = "spawnPosition";
    static label = "Spawn Position";
    static defaults: BehaviorConfig = {
        displacement: { x: 5, y: 5, z: 5 },
        offset: { x: 0, y: 0, z: 0 },
        aroundSource: false,
        aroundSourceMinMax: { x: 2, y: 4 },
    };

    constructor(
        private host: ParticlesComponent,
        private config: BehaviorConfig
    ) {}

    applySpawnData(data: ParticleSpawnData, _context: SpawnContext): void {
        const cfg = this.config;
        const disp = cfg.displacement ?? SpawnPositionBehavior.defaults.displacement;
        const off = cfg.offset ?? SpawnPositionBehavior.defaults.offset;

        data.position.x += (Math.random() - Math.random()) * disp.x;
        data.position.y += (Math.random() - Math.random()) * disp.y;
        data.position.z += (Math.random() - Math.random()) * disp.z;

        data.position.x += off.x;
        data.position.y += off.y;
        data.position.z += off.z;

        if (cfg.aroundSource) {
            const minMax = cfg.aroundSourceMinMax ?? SpawnPositionBehavior.defaults.aroundSourceMinMax;
            const angle = Math.random() * Math.PI * 2;
            const rdmX = minMax.x + Math.random() * (minMax.y - minMax.x);
            const rdmZ = minMax.x + Math.random() * (minMax.y - minMax.x);
            data.position.x += rdmX * Math.cos(angle);
            data.position.z += rdmZ * Math.sin(angle);
        }
    }

    onConfigChange(config: BehaviorConfig, prev: BehaviorConfig): RebuildHint {
        this.config = config;
        return "none";
    }

    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor {
        const opts = [...dataBinding, "options"];
        return {
            type: "folder",
            label: SpawnPositionBehavior.label,
            children: {
                displacement: {
                    type: "xyz",
                    label: "Displacement Range",
                    value: [...opts, "displacement"],
                    step: 0.01,
                },
                offset: {
                    type: "xyz",
                    label: "Offset",
                    value: [...opts, "offset"],
                    step: 0.01,
                },
                aroundSource: {
                    type: "checkbox",
                    label: "Spawn Around Source",
                    value: [...opts, "aroundSource"],
                },
                aroundSourceMinMax: {
                    type: "xyz",
                    label: "Around Source Radius",
                    value: [...opts, "aroundSourceMinMax"],
                    step: 0.01,
                    visible: () => this.config.aroundSource === true,
                },
            },
        };
    }

    dispose() {}
}
