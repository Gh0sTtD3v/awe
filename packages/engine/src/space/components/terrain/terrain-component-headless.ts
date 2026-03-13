import { PlaneGeometry, RingGeometry, Box3, Mesh, MeshBasicMaterial } from "three";

import { Component3D, DataChangeOpts } from "../../abstract/component-3d";
import { generateTerrainGeometry } from "./generate-geometry";

export type { TerrainComponentData } from "./terrain-component-data";

const geometryProps = {
    scale: true,
    noiseEnabled: true,
    definition: true,
    smoothCenter: true,
    smoothLength: true,
    islandSmooth: true,
    islandLength: true,
    seed: true,
    noiseDomain: true,
    shape: true,
    innerRadius: true,
};

/**
 * @internal
 *
 * Headless terrain component — geometry and collision only, no rendering.
 */
export class TerrainComponentHeadless extends Component3D<any> {
    private mesh: Mesh = null;

    /** @internal */
    protected async init() {
        const geometry = new PlaneGeometry(1, 1, 10, 10);
        const material = new MeshBasicMaterial();

        this.mesh = new Mesh(geometry, material);
        this.mesh.name = "floor collision";
        this.add(this.mesh);

        this.updateTransform();
        this.computeGeometry();
    }

    /** @internal */
    _onCreateCollisionMesh() {
        return this.mesh;
    }

    /** @internal */
    protected _getBBoxImp(box: Box3) {
        box.setFromObject(this.mesh);
        box.min.addScalar(-Number.EPSILON);
        box.max.addScalar(Number.EPSILON);
        return box;
    }

    /** @internal */
    onDataChange(opts: DataChangeOpts): void {
        let needsGeometry = false;

        for (const key in geometryProps) {
            if (opts.prev[key] !== this.data[key]) {
                needsGeometry = true;
                break;
            }
        }

        this.updateTransform();

        if (!opts.isProgress && needsGeometry) {
            this.computeGeometry();
        }
    }

    /** @internal */
    syncWithTransform() {
        this._assignXYZ("position", this.position);
        this._assignXYZ("rotation", this.rotation);
    }

    private updateTransform() {
        const { position, rotation, scale } = this.data;

        this.position.set(position.x, position.y, position.z);
        this.rotation.set(rotation.x, rotation.y, rotation.z);

        if (this.data.noiseEnabled) {
            this.scale.set(1, 1, 1);
        } else {
            this.scale.set(scale.x, scale.y, scale.z);
        }
    }

    private computeGeometry() {
        if (!this.data.noiseEnabled) {
            if (this.data.shape === "plane") {
                this.mesh.geometry = new PlaneGeometry(1, 1, 25, 25);
            } else if (this.data.shape === "circle") {
                this.mesh.geometry = new RingGeometry(0, 0.5, 25, 25);
            }
            this.mesh.geometry.rotateX(-Math.PI * 0.5);
        } else {
            this.mesh.geometry = generateTerrainGeometry(this.data);
            this.mesh.rotation.x = 0;
        }
    }

    /** @internal */
    protected dispose() {
        this.mesh.geometry.dispose();
        (this.mesh.material as MeshBasicMaterial).dispose();
        this.mesh = null;
    }
}
