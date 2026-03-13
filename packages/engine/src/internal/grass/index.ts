// import GridMesh from './gridmesh'

import OctreeSorter from "../rendering/libraries/sorters/octree";
import { IS_EDIT_MODE } from "../constants";
import { Plugins } from "../rendering/libraries";

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
import { GrassBatch } from "./grass-batch";
import InstancedMeshWrapper from "../pipeline/instance-mesh-wrapper";
import { Component3D } from "../../space/abstract/component-3d";

const temp = new Vector3();
const tempmatrix = new Matrix4();
const tempEuler = new Euler();

const KEY_PROPS = [
    "color",
    "uBaseColor",
    "uTipColor1",
    "uTipColor2",
    "uTipColor3",
    "uTipColor4",
    "uBaseColor2",
    "colorRepartition",
];

export class GrassFactory {
    //
    batches: Record<string, GrassBatch>;

    quadGeo: any;

    parent: Object3D;

    constructor() {
        //
        this.batches = {};
    }

    async preload(opts) {
        //
        this.parent = opts.parent;

        this.quadGeo = (await Plugins.GENERATIVE.QuadFactory.get()).geometry;
    }

    getKey(data: any) {
        //
        let key = KEY_PROPS.map((prop) => data[prop]).join("");

        return key;
    }

    getBatch(data: any) {
        //
        const key = this.getKey(data);

        let batch = this.batches[key];

        if (batch == null) {
            //
            batch = new GrassBatch({
                parent: this.parent,
                data,
                quadGeometry: this.quadGeo,
            });

            this.batches[key] = batch;
        }

        return {
            key,
            batch,
        };
    }

    get(data: any) {
        //
        const { key, batch } = this.getBatch(data);

        const wrapper = batch.add(data);

        const grass = new GrassInstance();

        grass._setOpts({
            key,
            batch,
            data,
            wrapper,
        });

        return grass;
    }

    update(grass: GrassInstance, data) {
        //
        const key = this.getKey(data);

        if (key === grass.key) {
            console.log("GrassFactory.update: key is the same");
            return;
        }

        if (grass.batch.mesh.instances.length > 1) {
            // change batch
            console.log("GrassFactory.update: will change batch");
            const { batch } = this.getBatch(data);

            grass.batch.remove(grass.wrapper);

            const wrapper = batch.add(data);

            grass._setOpts({
                key,
                batch,
                data,
                wrapper,
            });

            grass.key = key;
            //
        } else {
            // for perf just update the wrapper
            console.log("GrassFactory.update: 1 inst, will just update");

            delete this.batches[grass.key];

            grass.key = key;

            grass.batch.update(data);

            this.batches[key] = grass.batch;
        }
    }
}

export class GrassInstance {
    //
    key: string;
    batch: GrassBatch;
    data: any;
    wrapper: InstancedMeshWrapper;

    component: Component3D;

    setComponent(component: Component3D) {
        //
        this.component = component;
        this.wrapper?.attachTo(component);
    }

    _setOpts(opts: {
        key: string;
        batch: GrassBatch;
        data: any;
        wrapper: InstancedMeshWrapper;
    }) {
        //
        this.key = opts.key;
        this.batch = opts.batch;
        this.data = opts.data;
        this.wrapper = opts.wrapper;

        this.wrapper.attachTo(this.component);
    }

    buildCollisionMesh() {
        //
        return this.wrapper?.buildCollisionMesh();
    }

    updateFromSource() {
        //
        return this.wrapper.updateFromSource();
    }

    destroy() {
        //
        this.batch.remove(this.wrapper);
    }
}

export default new GrassFactory();
