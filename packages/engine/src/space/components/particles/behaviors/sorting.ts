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

export class SortingBehavior implements ParticleBehavior {
    static behaviorName = "sorting";
    static label = "Sorting";
    static defaults: BehaviorConfig = {
        enabled: true,
    };

    constructor(
        private host: ParticlesComponent,
        private config: BehaviorConfig
    ) {}

    getGeometryOptions(): Record<string, any> | null {
        if (this.config.enabled) {
            return { useSorting: true };
        }
        return null;
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
        return {
            type: "folder",
            label: SortingBehavior.label,
            children: {
                enabled: {
                    type: "checkbox",
                    label: "Enabled",
                    value: [...opts, "enabled"],
                    info: "Sort particles back-to-front for correct alpha blending",
                },
            },
        };
    }

    dispose(): void {}
}
