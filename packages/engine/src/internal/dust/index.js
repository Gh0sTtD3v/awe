import { PlaneGeometry, SRGBColorSpace } from "three";

import CloudMaterial from "./material/";

import InstancedPipelineMesh from "../pipeline/instanced-pipeline-mesh";

import InstancedGeometry from "../pipeline/instanced-geometry";

import Textures from "../textures";

import Wrapper from './wrapper';

import { Assets } from "../resources/assets";


import { DisposePipelinesMeshes } from "../utils/dispose";


class DustFactory {
    constructor() {
        this.isInit = false;

        this._init = false;

        this._instances = [];

        this.mesh = null;

        // globalThis.DustFactory = this;
    }

    async preload(texture) {
        let data = {
            name: "DUST_TEXTURE",
            url: texture || Assets.textures.dust3,
        };


        await Textures.loadTextures([data]);

        this.texture = Textures["DUST_TEXTURE"];

        this.texture.colorSpace = SRGBColorSpace;

        this.texture.needsUpdate = true;
    }

    async get(data = {}) {
        if (data.target == null) {
            debugger;
        }

        if (this._isInit) {
            await this.initialisation;
        }

        if (this._init == false) {
            this._init = true;

            this._isInit = true;

            this.initialisation = this.preload(data.texture);

            await this.initialisation;
        }

        if (this.mesh == null) {
            const baseGeometry = new PlaneGeometry(2, 2);

            this.mesh = new InstancedPipelineMesh(
                new InstancedGeometry(baseGeometry, {
                    scale: true,

                    boundingSphere: baseGeometry.boundingSphere,

                    transparencySorting: true,

                    name: "dust_geometry",

                    rotationY: true,

                    atlas: true,
                }),

                new CloudMaterial({ texture: this.texture }),

                {
                    visibleOnOcclusion: false,

                    type: "DUST",
                }
            );

            // parent.add(this.mesh);
        }

        const wrapper = new Wrapper(this.mesh, data);

        this._instances.push(wrapper);

        return wrapper;
    }

    disposeAll() {
        let i = 0;

        while (i < this._instances.length) {
            this._instances[i].dispose();
            i++;
        }

        this.instances = [];

        if (this.mesh) {

            DisposePipelinesMeshes(this.mesh, true );

            this.mesh.dispose()

            this.mesh = null
        }
    }
}

export default new DustFactory();
