// @ts-ignore

// import GridMesh from './gridmesh'

import OctreeSorter from "../rendering/libraries/sorters/octree";
import { IS_EDIT_MODE } from "../constants";
import { Plugins } from "../rendering/libraries";

import { InstancedMeshFactory } from "../instancedmesh";

import QuadMaterial from "./materials/quad-material";

import DepthMaterial from "./materials/depth-material";

import PipeLineMesh from "../pipeline/pipeline-mesh";

import {
    Vector3,
    Matrix4,
    Euler,
    MeshBasicMaterial,
    BoxGeometry,
    Object3D,
} from "three";
import InstancedMeshWrapper from "../pipeline/instance-mesh-wrapper";

const temp = new Vector3();
const tempmatrix = new Matrix4();
const tempEuler = new Euler();

export class GrassBatch {
    //
    data: any;
    quadGeo: any;
    _baseMesh: PipeLineMesh;
    mesh: any;
    material: QuadMaterial;

    constructor(opts: { parent: Object3D; data: any; quadGeometry: any }) {
        //
        this.quadGeo = opts.quadGeometry;

        this.data = opts.data;

        this._create(opts.parent);
    }

    _create(parent) {
        //
        const geo = this.quadGeo;

        var material = new QuadMaterial(this.data);

        this.material = material;

        this._baseMesh = new PipeLineMesh(
            geo,
            new MeshBasicMaterial({ color: 0xffffff, transparent: false })
        );

        const instancedMeshFactory = new InstancedMeshFactory();

        const opts = {
            type: "scattermesh",
            baseMesh: this._baseMesh,
            material: material,
            enableRealTimeShadow: false,
            instancedGeometryOptions: {},
        };

        this._baseMesh.geometry.computeBoundingBox();

        this.mesh = instancedMeshFactory.get(parent, opts);

        this.mesh.customDepthMaterial = new DepthMaterial();

        if (parent != null) {
            //
            parent.add(this.mesh);
        }

        // if( IS_EDIT_MODE != true  ) {

        //     sorter.needsBuild = true;
        // }
    }

    update(data) {
        //
        this.data = data;

        console.log("batch update", data);

        this.material.updateColors(data);
    }

    add(data) {
        // useless to build bounding boxes.. it here since most of the time its duplicated via batch..
        // see batch component instead

        // let i = 0;

        // debugger;

        const d = {
            position: data.position,
            rotation: data.rotation,
            scale: data.scale,
            boundingBox: null,
        };

        const dimensions = new Vector3().subVectors(
            this._baseMesh.geometry.boundingBox.max,
            this._baseMesh.geometry.boundingBox.min
        );

        const boxDummyGeo = new BoxGeometry(
            dimensions.x,
            dimensions.y,
            dimensions.z
        );

        boxDummyGeo.scale(d.scale.x, d.scale.y, d.scale.z);

        tempEuler.set(d.rotation.x, d.rotation.y, d.rotation.z);

        tempmatrix.makeRotationFromEuler(tempEuler);

        boxDummyGeo.applyMatrix4(tempmatrix);

        boxDummyGeo.translate(d.position.x, d.position.y, d.position.z);

        boxDummyGeo.computeBoundingBox();

        // set the bounding box

        d.boundingBox = boxDummyGeo.boundingBox.clone();

        const wrapper = this.mesh.add(d);

        return wrapper;
    }

    remove(wrapper: InstancedMeshWrapper) {
        //
        this.mesh.remove(wrapper);
    }
}
