// @ts-check

import Textures from "../textures";

import { PlaneGeometry, MeshBasicMaterial, BoxGeometry, Mesh } from "three";

import InteractionMaterial from "./material";

import InstancedPipelineMesh from "../pipeline/instanced-pipeline-mesh";

import InstancedGeometry from "../pipeline/instanced-geometry";

import Wrapper from "./wrapper";

import { DisposePipelinesMeshes } from "../utils/dispose";
import { Assets } from "../resources/assets";
import { AssetResolver } from "../assets";

import AspectPlugin from "./aspect-plugin";

import { IS_MOBILE } from "../constants";

export class InteractionFactory {
    /**
     * @type {InteractionFactory}
     */
    static _instance = null;

    static get instance() {
        if (this._instance == null) {
            this._instance = new InteractionFactory();
        }

        return this._instance;
    }

    constructor() {
        this.isInit = false;

        this._init = false;

        this.mesh = null;

        this.meshes = {};

        this.instances = [];

        // globalThis.CloudFactory = this;
    }

    async preload() {
        let data = {
            name: "SPRITE_UI_TEXTURE",
            url: IS_MOBILE
                ? Assets.sprites.mobileuikeys
                : Assets.sprites.uikeys,
        };

        await Textures.loadTextures([data]);

        if (IS_MOBILE) {
            this.json = await (
                await AssetResolver.fetch(Assets.sprites.mobileuikeysJSON, { type: "other" })
            ).json();
        } else {
            this.json = await (await AssetResolver.fetch(Assets.sprites.uikeysJSON, { type: "other" })).json();
        }
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

        if (this.meshes["useBillBoard" + data.billboard] == null) {
            const baseGeometry = new PlaneGeometry(2, 2);

            baseGeometry.deleteAttribute("normal");

            const aspectPlugin = new AspectPlugin();

            this.meshes["useBillBoard" + data.billboard] =
                new InstancedPipelineMesh(
                    new InstancedGeometry(baseGeometry, {
                        scale: true,

                        opacity: true,

                        rotation: data.billboard ? false : true,

                        atlas: true,

                        color: true,

                        boundingSphere: baseGeometry.boundingSphere,

                        transparencySorting: true,

                        plugins: [aspectPlugin],

                        name: "interaction_geometry",
                    }),

                    new InteractionMaterial({
                        billboard: data.billboard,
                        texture: Textures["SPRITE_UI_TEXTURE"],
                    }),

                    {
                        visibleOnOcclusion: false,

                        type: "INTERACTION",
                    }
                );

            // this._instances['clouds'].customDepthMaterial = new InstancedShadow()

            parent.add(this.meshes["useBillBoard" + data.billboard]);
        }

        const wrapper = new Wrapper(
            this.meshes["useBillBoard" + data.billboard],
            data,
            this.json
        );

        this.instances.push(wrapper);

        return wrapper;
    }

    dispose() {
        let i = 0;

        while (i < this.instances.length) {
            this.instances[i].dispose();

            i++;
        }

        if (this.mesh) {
            DisposePipelinesMeshes(this.mesh, true);

            this.mesh.dispose();

            this.mesh = null;

            this.instances = null;
        }
    }

    buildCollisionMesh = () => {
        if (this._material == null) {
            this._material = new MeshBasicMaterial({
                color: 0xff0000,
                wireframe: true,
            });
        }

        const mesh = new Mesh(new BoxGeometry(2, 2), this._material);

        mesh.visible = true;

        mesh.updateMatrixWorld();

        this._collisionMesh = mesh;

        return mesh;
    };

    // disposeAll() {
    //     if (this.mesh) {
    //         if (this.mesh.parent) {
    //             this.mesh.parent.remove(
    //                 this.mesh,
    //             );
    //         }

    //         this.mesh.geometry.dispose();

    //         this.mesh.dispose();

    //         this.mesh = null;
    //     }
    // }
}
