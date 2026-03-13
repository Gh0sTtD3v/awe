import Textures from "../textures";

import {
    MeshBasicMaterial,
    PlaneGeometry,
    SphereGeometry,
    RepeatWrapping,
    LinearFilter,
} from "three";

import PipeLineMesh from "../pipeline/pipeline-mesh";

import BasicMaterial from "../rendering/materials/basic";

import LambertMaterial from "../rendering/materials/lambert";

import PreFrag from "./shaders/pre.frag.ts";

import MapFragment from "./shaders/mapfragment.glsl.ts";

import Shared from "../utils/globals/shared";

import { Assets } from "../resources/assets";

class OceanFactory {
    constructor() {
        this.isInit = false;

        this._init = false;

        this._instances = [];

        // globalThis.OceanFactory = this;
    }

    async preload() {
        let data = {
            name: "OCEAN_TEXTURE",
            url: Assets.textures.oceanSuperHd,
        };

        await Textures.loadTextures([data]);

        const texture = Textures["OCEAN_TEXTURE"];

        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;

        texture.needsUpdate = true;
    }

    async get(parent, data = {}) {
        console.log("get Ocean...");

        if (this._isInit) {
            await this.initialisation;
        }

        if (this._init == false) {
            this._init = true;

            this._isInit = true;

            this.initialisation = this.preload();

            await this.initialisation;
        }

        let opts = {
            map: Textures["OCEAN_TEXTURE"],

            chunks: {
                fragment: {
                    map_fragment: MapFragment,
                },
            },

            fragmentShaderHooks: {
                prefix: PreFrag,
            },

            side: 2,

            color: data.color ? data.color : "#ffffff",

            opacity: data.opacity ? data.opacity : 1,

            transparent: true,

            uniforms: {
                timer: Shared.timer_d2,

                repeat: {
                    value: data.repeat ? data.repeat : 1,
                },
            },
        };

        // if (this.data.scale.x < this.data.scale.z) {
        //     ratio = this.data.scale.x / this.data.scale.z;

        //     this.textureMap.repeat.set(1 * ratio, this.textureMapRatio);
        // } else {
        //     ratio = this.data.scale.z / this.data.scale.x;

        //     this.textureMap.repeat.set(1, this.textureMapRatio * ratio);
        // }

        const diffuseMaterial = new BasicMaterial(opts);

        const lightingMaterial = new LambertMaterial(opts);

        const geometry = new PlaneGeometry(2, 2, 1, 1);

        geometry.rotateX(Math.PI * 0.5);

        const mesh = new PipeLineMesh(
            geometry,

            diffuseMaterial,

            {
                lightingMaterial: lightingMaterial,

                occlusionMaterial: new MeshBasicMaterial({ color: 0x000000 }),
            }
        );

        mesh.name = "ocean";

        mesh.receiveShadow = true;

        if (parent != null) {
            parent.add(mesh);
        }

        this._instances.push(mesh);

        if (data.position) {
            mesh.position.copy(data.position);
        }

        if (data.scale) {
            mesh.scale.copy(data.scale);
        }

        if (data.rotation) {
            mesh.rotation.set(
                data.rotation.x,
                data.rotation.y,
                data.rotation.z
            );
        }

        return mesh;
    }

    disposeAll() {
        let i = 0;

        while (i < this._instances.length) {
            if (this._instances[i].parent) {
                this._instances[i].parent.remove(this._instances[i]);
            }

            this._instances[i].dispose();

            this._instances[i].geometry.dispose();

            this._instances[i] = null;
            i++;
        }

        this._instances = [];
    }
}

export default new OceanFactory();
