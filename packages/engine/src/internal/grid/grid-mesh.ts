import PipeLineMesh from "../pipeline/pipeline-mesh";

import Material from "./material";

import { PlaneGeometry, MeshBasicMaterial, Vector3 } from "three";

import { DisposePipelinesMeshes } from "../utils/dispose";

export type GridMode = "XY" | "XZ" | "YZ";

export default class GridMesh extends PipeLineMesh {
    //
    gridMaterial: Material;

    mode: GridMode;

    constructor() {
        const geometry = new PlaneGeometry(5000, 5000, 2, 2);

        const diffuseMaterial = new Material();

        geometry.rotateX(Math.PI * 0.5);

        super(
            geometry,

            diffuseMaterial,

            {
                lightingMaterial: diffuseMaterial,

                visibleOnOcclusion: false,

                visibleOnMirror: false,

                occlusionMaterial: new MeshBasicMaterial({
                    color: 0x000000,
                    visible: false,
                }),
            }
        );

        this.gridMaterial = diffuseMaterial;

        this.name = "grid";

        this.setMode("XZ");
    }

    setMode(mode: GridMode, target?: Vector3) {
        //
        this.mode = mode;

        switch (mode) {
            case "XY":
                this.gridMaterial.setMode("XY");
                this.rotation.set(-Math.PI * 0.5, 0, 0);
                break;

            case "XZ":
                this.gridMaterial.setMode("XZ");
                this.rotation.set(0, 0, 0);
                break;

            case "YZ":
                this.gridMaterial.setMode("YZ");
                this.rotation.set(0, 0, -Math.PI * 0.5);
                break;
        }

        if (target) {
            this.position.set(target.x, target.y, target.z);
        } else {
            this.position.set(0, 0, 0);
        }
    }

    dispose() {
        //
        super.dispose();

        DisposePipelinesMeshes(this);
    }
}
