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

export class ShapeEmitterBehavior implements ParticleBehavior {
    static behaviorName = "shapeEmitter";
    static label = "Emitter Shape";
    static defaults: BehaviorConfig = {
        // Which emitter shape to use
        shape: "cone", // "cone" | "sphere" | "hemisphere" | "circle" | "box-edge" | "disc"

        // --- Cone ---
        coneAngle: 25, // degrees, 0–90
        coneRadius: 1,

        // --- Sphere / Hemisphere ---
        sphereRadius: 1,

        // --- Circle ---
        circleRadius: 1,

        // --- Box Edge ---
        boxSize: { x: 1, y: 1, z: 1 }, // half-extents

        // --- Disc ---
        discRadius: 1,
        discInnerRadius: 0, // 0 = solid disc

        // --- Common ---
        setDirection: false,
        directionStrength: 1,
    };

    private plugin: any = null;

    constructor(
        private host: ParticlesComponent,
        private config: BehaviorConfig
    ) {}

    getPlugin(): any | null {
        if (!this.config.setDirection) return null;

        const plugin: any = {
            name: "ParticleShapeEmitterPlugin",
            uniforms: {},
            attributes: {
                shapeDirection: {
                    name: "shapeDirection",
                    array: [],
                    length: 3,
                    defaultValue: [0, 1, 0],
                },
            },
            vertexShaderHooks: {
                prefix: `
                    attribute vec3 shapeDirection;
                `,
                main: `
                    particlePosition += shapeDirection * vTimerDiff;
                `,
                suffix: ``,
            },
            defines: [] as any,
        };

        this.plugin = plugin;
        return plugin;
    }

    applySpawnData(data: ParticleSpawnData, _context: SpawnContext): void {
        const cfg = this.config;
        const shape = cfg.shape ?? ShapeEmitterBehavior.defaults.shape;

        let px = 0,
            py = 0,
            pz = 0;
        let dx = 0,
            dy = 1,
            dz = 0; // default direction: up

        switch (shape) {
            case "cone": {
                const halfAngle =
                    ((cfg.coneAngle ?? ShapeEmitterBehavior.defaults.coneAngle) *
                        Math.PI) /
                    180;
                const radius =
                    cfg.coneRadius ??
                    ShapeEmitterBehavior.defaults.coneRadius;

                // Random angle around Y axis
                const phi = Math.random() * Math.PI * 2;
                // Random angle from Y axis, within cone half-angle
                const theta = Math.random() * halfAngle;

                const sinTheta = Math.sin(theta);
                // Random radius within the cone's cross-section at the base
                const r = Math.sqrt(Math.random()) * radius;

                px = r * Math.cos(phi);
                py = 0;
                pz = r * Math.sin(phi);

                // Direction: points outward along cone surface
                dx = sinTheta * Math.cos(phi);
                dy = Math.cos(theta);
                dz = sinTheta * Math.sin(phi);
                break;
            }

            case "sphere": {
                const radius =
                    cfg.sphereRadius ??
                    ShapeEmitterBehavior.defaults.sphereRadius;
                // Uniform sphere point picking
                const u = Math.random();
                const v = Math.random();
                const theta = 2 * Math.PI * u;
                const phi = Math.acos(2 * v - 1);

                const sinPhi = Math.sin(phi);
                dx = sinPhi * Math.cos(theta);
                dy = sinPhi * Math.sin(theta);
                dz = Math.cos(phi);

                px = dx * radius;
                py = dy * radius;
                pz = dz * radius;
                break;
            }

            case "hemisphere": {
                const radius =
                    cfg.sphereRadius ??
                    ShapeEmitterBehavior.defaults.sphereRadius;
                // Uniform sphere, clamp to upper half (y >= 0)
                const u = Math.random();
                const v = Math.random() * 0.5; // [0, 0.5] maps to upper hemisphere
                const theta = 2 * Math.PI * u;
                const phi = Math.acos(1 - 2 * v); // phi in [0, π/2]

                const sinPhi = Math.sin(phi);
                dx = sinPhi * Math.cos(theta);
                dy = Math.cos(phi); // always >= 0
                dz = sinPhi * Math.sin(theta);

                px = dx * radius;
                py = dy * radius;
                pz = dz * radius;
                break;
            }

            case "circle": {
                const radius =
                    cfg.circleRadius ??
                    ShapeEmitterBehavior.defaults.circleRadius;
                // Random point on circle edge (XZ plane)
                const angle = Math.random() * Math.PI * 2;
                px = Math.cos(angle) * radius;
                py = 0;
                pz = Math.sin(angle) * radius;

                // Direction: outward from center in XZ
                dx = Math.cos(angle);
                dy = 0;
                dz = Math.sin(angle);
                break;
            }

            case "box-edge": {
                const size =
                    cfg.boxSize ?? ShapeEmitterBehavior.defaults.boxSize;
                // Pick a random point on the surface of a box
                const face = Math.floor(Math.random() * 6);
                const ru = Math.random() * 2 - 1; // [-1, 1]
                const rv = Math.random() * 2 - 1; // [-1, 1]

                switch (face) {
                    case 0: // +X
                        px = size.x;
                        py = ru * size.y;
                        pz = rv * size.z;
                        dx = 1;
                        dy = 0;
                        dz = 0;
                        break;
                    case 1: // -X
                        px = -size.x;
                        py = ru * size.y;
                        pz = rv * size.z;
                        dx = -1;
                        dy = 0;
                        dz = 0;
                        break;
                    case 2: // +Y
                        px = ru * size.x;
                        py = size.y;
                        pz = rv * size.z;
                        dx = 0;
                        dy = 1;
                        dz = 0;
                        break;
                    case 3: // -Y
                        px = ru * size.x;
                        py = -size.y;
                        pz = rv * size.z;
                        dx = 0;
                        dy = -1;
                        dz = 0;
                        break;
                    case 4: // +Z
                        px = ru * size.x;
                        py = rv * size.y;
                        pz = size.z;
                        dx = 0;
                        dy = 0;
                        dz = 1;
                        break;
                    case 5: // -Z
                        px = ru * size.x;
                        py = rv * size.y;
                        pz = -size.z;
                        dx = 0;
                        dy = 0;
                        dz = -1;
                        break;
                }
                break;
            }

            case "disc": {
                const outer =
                    cfg.discRadius ??
                    ShapeEmitterBehavior.defaults.discRadius;
                const inner =
                    cfg.discInnerRadius ??
                    ShapeEmitterBehavior.defaults.discInnerRadius;
                // Uniform random point on annular disc (XZ plane)
                const angle = Math.random() * Math.PI * 2;
                const r = Math.sqrt(
                    inner * inner +
                        Math.random() * (outer * outer - inner * inner)
                );

                px = Math.cos(angle) * r;
                py = 0;
                pz = Math.sin(angle) * r;

                // Direction: up
                dx = 0;
                dy = 1;
                dz = 0;
                break;
            }
        }

        data.position.x += px;
        data.position.y += py;
        data.position.z += pz;

        if (cfg.setDirection) {
            const strength =
                cfg.directionStrength ??
                ShapeEmitterBehavior.defaults.directionStrength;
            data.shapeDirection = [
                dx * strength,
                dy * strength,
                dz * strength,
            ];
        }
    }

    onConfigChange(config: BehaviorConfig, prev: BehaviorConfig): RebuildHint {
        this.config = config;
        // setDirection changes the attribute set → requires rebuild
        if (config.setDirection !== prev.setDirection) {
            return "rebuild";
        }
        return "none";
    }

    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor {
        const opts = [...dataBinding, "options"];
        const isShape = (s: string) => () =>
            (this.config.shape ?? "cone") === s;
        const isShapeAny =
            (...shapes: string[]) =>
            () =>
                shapes.includes(this.config.shape ?? "cone");

        return {
            type: "folder",
            label: ShapeEmitterBehavior.label,
            children: {
                shape: {
                    type: "select",
                    label: "Shape",
                    value: [...opts, "shape"],
                    items: [
                        { id: "cone", label: "Cone" },
                        { id: "sphere", label: "Sphere" },
                        { id: "hemisphere", label: "Hemisphere" },
                        { id: "circle", label: "Circle" },
                        { id: "box-edge", label: "Box Edge" },
                        { id: "disc", label: "Disc" },
                    ],
                },

                // --- Cone-specific ---
                coneAngle: {
                    type: "number",
                    label: "Cone Angle",
                    value: [...opts, "coneAngle"],
                    min: 0,
                    max: 90,
                    step: 0.5,
                    visible: isShape("cone"),
                },
                coneRadius: {
                    type: "number",
                    label: "Cone Radius",
                    value: [...opts, "coneRadius"],
                    min: 0,
                    max: 50,
                    step: 0.01,
                    visible: isShape("cone"),
                },

                // --- Sphere / Hemisphere ---
                sphereRadius: {
                    type: "number",
                    label: "Sphere Radius",
                    value: [...opts, "sphereRadius"],
                    min: 0,
                    max: 50,
                    step: 0.01,
                    visible: isShapeAny("sphere", "hemisphere"),
                },

                // --- Circle ---
                circleRadius: {
                    type: "number",
                    label: "Circle Radius",
                    value: [...opts, "circleRadius"],
                    min: 0,
                    max: 50,
                    step: 0.01,
                    visible: isShape("circle"),
                },

                // --- Box Edge ---
                boxSize: {
                    type: "xyz",
                    label: "Box Half-Extents",
                    value: [...opts, "boxSize"],
                    min: 0,
                    max: 50,
                    step: 0.01,
                    visible: isShape("box-edge"),
                },

                // --- Disc ---
                discRadius: {
                    type: "number",
                    label: "Disc Radius",
                    value: [...opts, "discRadius"],
                    min: 0,
                    max: 50,
                    step: 0.01,
                    visible: isShape("disc"),
                },
                discInnerRadius: {
                    type: "number",
                    label: "Inner Radius",
                    value: [...opts, "discInnerRadius"],
                    min: 0,
                    max: 50,
                    step: 0.01,
                    visible: isShape("disc"),
                },

                // --- Common ---
                setDirection: {
                    type: "checkbox",
                    label: "Set Initial Direction",
                    value: [...opts, "setDirection"],
                },
                directionStrength: {
                    type: "number",
                    label: "Direction Strength",
                    value: [...opts, "directionStrength"],
                    min: 0,
                    max: 50,
                    step: 0.01,
                    visible: () => this.config.setDirection === true,
                },
            },
        };
    }

    dispose() {
        this.plugin = null;
    }
}
