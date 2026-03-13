import { Color } from "three";
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

const tempColor = new Color();

export class ColorBehavior implements ParticleBehavior {
    static behaviorName = "color";
    static label = "Color";
    static defaults: BehaviorConfig = {
        colors: [0xffffff, 0xffffff, 0xffffff, 0xffffff],
    };

    constructor(
        private host: ParticlesComponent,
        private config: BehaviorConfig
    ) {}

    getPlugin(): any {
        return {
            name: "ParticleColorPlugin",
            attributes: {
                instanceColor: {
                    name: "instanceColor",
                    array: [],
                    length: 3,
                    defaultValue: [1, 1, 1],
                },
            },
            defines: {
                USE_INSTANCING_COLOR: "",
                USE_COLOR: "",
            },
            chunks: {
                fragment: {},
                vertex: {
                    color_vertex: `
                        #if defined( USE_COLOR_ALPHA )
                            vColor = vec4( 1.0 );
                        #elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
                            vColor = vec3( 1.0 );
                        #endif
                        #ifdef USE_INSTANCING_COLOR
                            vColor.xyz *= instanceColor.xyz;
                        #endif
                    `,
                },
            },
        };
    }

    applySpawnData(data: ParticleSpawnData, _context: SpawnContext): void {
        const colors = this.config.colors ?? ColorBehavior.defaults.colors;
        const count = colors.length;
        if (count > 0) {
            const random = Math.round(Math.random() * (count - 1));
            tempColor.setHex(colors[random]);
            data.instanceColor = [tempColor.r, tempColor.g, tempColor.b];
        }
    }

    onConfigChange(config: BehaviorConfig, prev: BehaviorConfig): RebuildHint {
        this.config = config;
        return "none";
    }

    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor {
        const opts = [...dataBinding, "options"];
        const colors = this.config.colors ?? ColorBehavior.defaults.colors;

        const children: Record<string, any> = {};
        for (let i = 0; i < colors.length; i++) {
            children["color" + i] = {
                type: "color",
                label: "Color " + (i + 1),
                value: [...opts, "colors", String(i)],
            };
        }

        return {
            type: "folder",
            label: ColorBehavior.label,
            children,
        };
    }

    dispose() {}
}
