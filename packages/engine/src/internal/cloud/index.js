import Textures from "../textures";

import { BoxGeometry, PlaneGeometry } from "three";

import CloudMaterial from "./material";

import InstancedPipelineMesh from "../pipeline/instanced-pipeline-mesh";

import InstancedGeometry from "../pipeline/instanced-geometry";

import InstancedShadow from "../rendering/materials/instancedshadow";

import { Assets } from "../resources/assets";

export class CloudFactory {
    constructor() {
        this.isInit = false;

        this._init = false;

        this._instances = {};

        // globalThis.CloudFactory = this;
    }

    async preload() {
        let data = {
            name: "CLOUD_TEXTURE",
            url: Assets.textures.cloudsalt,
        };

        await Textures.loadTextures([data]);
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


        if (this._instances["clouds"] == null) {
            const baseGeometry = new PlaneGeometry(2, 2);

            this._instances["clouds"] = new InstancedPipelineMesh(
                new InstancedGeometry(baseGeometry, {
                    scale: true,

                    opacity: true,

                    atlas: true,

                    boundingSphere: baseGeometry.boundingSphere,

                    transparencySorting: true,

                    name: "cloud_geometry",
                }),

                new CloudMaterial({ texture: Textures["CLOUD_TEXTURE"] }),

                {
                    visibleOnOcclusion: false,

                    type: "CLOUD",
                }
            );

            parent.add(this._instances.clouds);
        }

        if(data.atlas == null ){

            data.atlas = Math.floor(Math.random() * 4);
        }

        const instance = this._instances["clouds"].add(data)

        this.setAtlas(instance, data);

        return instance
    }

    buildCollisionMesh() {


        if(this.collisionMesh == null) {

            const geometry = new BoxGeometry(2, 2, 2);

            this.collisionMesh = new Mesh( geometry )

        }


        this.collisionMesh.visible = false;

        return mesh;
    }
    
    setAtlas(instance, data) {

        if (data.atlas != null) {

            const val = parseInt(data.atlas)

            switch ( val ) {

                case 0:

                    instance.atlas = { x: 0.5, y: 0.5, z: 0.0, w: 0.0 };

                break

                case 1:

                    instance.atlas = { x: 0.5, y: 0.5, z: 0.5, w: 0 };

                break;

                case 2:

                    instance.atlas = { x: 0.5, y: 0.5, z: 0, w: 0.5 };

                break;

                case 3:

                    instance.atlas = { x: 0.5, y: 0.5, z: 0.5, w: 0.5 };

                break;
            }

            // debugger
           
        }
    }

    disposeAll() {
        if (this._instances["clouds"]) {
            if (this._instances["clouds"].parent) {
                this._instances["clouds"].parent.remove(
                    this._instances["clouds"]
                );
            }

            this._instances["clouds"].geometry.dispose();

            this._instances["clouds"].dispose();

            this._instances["clouds"] = null;
        }
    }
}
