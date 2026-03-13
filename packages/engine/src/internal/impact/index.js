import { PlaneGeometry, SRGBColorSpace } from "three";

import ImpactMaterial from "./material/";

import InstancedPipelineMesh from "../pipeline/instanced-pipeline-mesh";

import InstancedGeometry from "../pipeline/instanced-geometry";

import Textures from "../textures";

import Wrapper from './wrapper';

import { Assets } from "../resources/assets";

export class ImpactFactory {
    constructor() {
        this.isInit = false;

        this._init = false;

        this._instances = [];

        this.mesh = null;

        // globalThis.ImpactFactory = this;
    }

    async preload() {
        let data = {
            name: "IMPACT_TEXTURE",
            url: Assets.textures.impact,
        };

        await Textures.loadTextures([data]);

        this.texture = Textures["IMPACT_TEXTURE"];

        this.texture.colorSpace = SRGBColorSpace;

        this.texture.needsUpdate = true;
    }

    async get(parent, data = {}) {
        if (this._isInit) {
            await this.initialisation;
        }

        if (this._init == false) {
            this._init = true;

            this._isInit = true;

            this.initialisation = this.preload();

            await this.initialisation;
        }

        if (this.mesh == null) {
            const baseGeometry = new PlaneGeometry(2, 2);

            this.mesh = new InstancedPipelineMesh(
                new InstancedGeometry(baseGeometry, {
                    scale: true,

                    boundingSphere: baseGeometry.boundingSphere,

                    transparencySorting: true,

                    name: "impact_geometry",

                    rotationY: true,

                    atlas: true,
                }),

                new ImpactMaterial({
                    color: data.color,
                    texture: this.texture,
                }),

                {
                    visibleOnOcclusion: false,

                    type: "IMPACT",
                }
            );

            // parent.add(this.mesh);
        }

        const wrapper = new Wrapper(this.mesh, data);

        this._instances.push(wrapper);

        return wrapper;
    }

    dispose() {
        this.disposeAll();
    }

    disposeAll() {
        let i = 0;

        while (i < this._instances.length) {
            this._instances[i].dispose();

            i++;
        }

        this.instances = [];

        if (this.mesh) {
            if (this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }

            this.mesh.geometry.dispose();

            this.mesh.dispose();

            this.mesh = null;
        }
    }
}
