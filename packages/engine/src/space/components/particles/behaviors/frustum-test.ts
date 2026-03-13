import {
    Mesh,
    MeshBasicMaterial,
    SphereGeometry,
    Sphere,
    Vector3,
} from "three";
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

export class FrustumTestBehavior implements ParticleBehavior {
    static behaviorName = "frustumTest";
    static label = "Frustum Test";
    static defaults: BehaviorConfig = {
        radius: 12,
        display: true,
    };

    private debugMesh: Mesh | null = null;
    private sphere = new Sphere();
    private _currentFrame = -1;
    private _testedFrame = -1;
    private _setup = false;
    private _lastFrustumResult = false;

    constructor(
        private host: ParticlesComponent,
        private config: BehaviorConfig
    ) {}

    init(): void {
        const radius = this.config.radius ?? FrustumTestBehavior.defaults.radius;

        this.debugMesh = new Mesh(
            new SphereGeometry(radius, 16, 16),
            new MeshBasicMaterial({
                color: "green",
                transparent: true,
                opacity: 0.5,
                depthWrite: false,
            })
        );
        this.debugMesh.visible = false;
    }

    onFrame(_delta: number): void {
        this._currentFrame++;

        if (!this._setup) {
            this._trySetup();
        }
    }

    async setupMaterial(_mesh: any): Promise<void> {
        this._trySetup();
    }

    onConfigChange(config: BehaviorConfig, prev: BehaviorConfig): RebuildHint {
        this.config = config;
        if (config.radius !== prev.radius) {
            if (this.debugMesh) {
                this.debugMesh.geometry.dispose();
                const radius = config.radius ?? FrustumTestBehavior.defaults.radius;
                this.debugMesh.geometry = new SphereGeometry(radius, 16, 16);
                this.debugMesh.geometry.computeBoundingSphere();
            }
        }
        return "none";
    }

    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor {
        const opts = [...dataBinding, "options"];
        return {
            type: "folder",
            label: FrustumTestBehavior.label,
            children: {
                radius: {
                    type: "number",
                    label: "Radius",
                    value: [...opts, "radius"],
                    step: 0.5,
                    min: 1,
                    max: 100,
                },
                display: {
                    type: "checkbox",
                    label: "Display Debug Sphere",
                    value: [...opts, "display"],
                },
            },
        };
    }

    dispose(): void {
        this._setup = false;
        if (this.debugMesh) {
            if (this.debugMesh.parent) {
                this.debugMesh.parent.remove(this.debugMesh);
            }
            this.debugMesh.geometry.dispose();
            (this.debugMesh.material as MeshBasicMaterial).dispose();
            this.debugMesh = null;
        }
    }

    // ── Private ──

    private _trySetup() {
        const mesh = (this.host as any).getMesh?.();
        if (mesh != null && mesh.geometry) {
            mesh.geometry.setUniqueFrustumTest?.(
                this._customFrustumTest.bind(this)
            );
            this._setup = true;

            // Attach debug mesh to source if present
            if (this.debugMesh) {
                const parent = this.host.data.source ?? this.host;
                (parent as any).add?.(this.debugMesh);
            }
        }
    }

    private _customFrustumTest(frustum: any): boolean {
        if (this._testedFrame !== this._currentFrame) {
            const radius = this.config.radius ?? FrustumTestBehavior.defaults.radius;

            if (this.debugMesh) {
                this.sphere.radius = radius;
                this.sphere.center.set(
                    this.debugMesh.matrixWorld.elements[12],
                    this.debugMesh.matrixWorld.elements[13],
                    this.debugMesh.matrixWorld.elements[14]
                );
            }

            this._lastFrustumResult = frustum.intersectsSphere(this.sphere);
            this._testedFrame = this._currentFrame;
        }

        return this._lastFrustumResult;
    }
}
