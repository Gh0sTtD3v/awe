import {
    MeshBasicMaterial,
    SRGBColorSpace,
    Mesh,
    ShaderMaterial,
    UniformsLib,
} from "three";

import InstancedPipelineMesh from "../pipeline/instanced-pipeline-mesh";

import InstancedGeometry from "../pipeline/instanced-geometry";

import VertexShader from './shaders/vertex.glsl.ts'
import FragmentShader from './shaders/fragment.glsl.ts'
import DepthShader from './shaders/depth.glsl.ts'

import Geometry from './geometry';

import Shared from "../utils/globals/shared";

import Textures from "../textures";

import { Assets } from "../resources/assets";

import {

    CAMERA_LAYERS

} from '../constants'

export class BirdFactory {

    constructor( factoryOptions = {} ) {

        this.factoryOptions = factoryOptions

        this._init = false;

        this._instances = {};
    }

    async preload() {
        this.geometry = new Geometry();

        let data = {
            name: "BIRD_TEXTURE",
            url: Assets.textures.butterfly,
        };

        if( Textures["BIRD_TEXTURE"] == null ) {

            await Textures.loadTextures([data]);
        }

        this.texture = Textures["BIRD_TEXTURE"];

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


        // getpluginstring

        if (this.mesh == null ) {

            const baseGeometry = this.geometry;

            baseGeometry.computeBoundingSphere();

            const opts = {
                name: "bird_material",

                side: 2,

                uniforms: {
                    timer: Shared.timer,

                    map: {
                        value: this.texture,
                    },
                },

                vertexShader: VertexShader,

                fragmentShader: FragmentShader,

                transparent: true,

                fog: true,

                defines : {
                    INSTANCE: 1
                }
            }


            // default to animated

            if( this.factoryOptions.animated == true || this.factoryOptions.animated == null ){

                opts.defines.ANIMATED = 1
            }

            opts.uniforms = Object.assign(opts.uniforms, UniformsLib.fog);

            const diffuseMaterial = new ShaderMaterial(opts);

            const lightingMaterial = new ShaderMaterial(opts);

            this.mesh = new InstancedPipelineMesh(

                new InstancedGeometry(baseGeometry, {
                    shadow: data.shadow,

                    scale: true,

                    opacity: true,

                    useNormal: true,

                    color: true,

                    rotation: true,

                    randomID: this.factoryOptions.animated != true,

                    boundingSphere: baseGeometry.boundingSphere,

                    name: "bird_geometry",
                }),

                diffuseMaterial,

                {
                    lightingMaterial: lightingMaterial,

                    visibleOnOcclusion: true,

                    type: "BIRD",
                }
            );

            this.mesh.customDepthMaterial = new ShaderMaterial({
                side: 2,

                uniforms: {
                    timer: Shared.timer,

                    map: {
                        value: this.texture,
                    },
                },

                vertexShader: VertexShader,

                fragmentShader: DepthShader,
            });


            if( this.factoryOptions.animated == true || this.factoryOptions.animated == null ){

                this.mesh.customDepthMaterial.defines.ANIMATED = 1
            }


            this.mesh.layers.disableAll()

            this.mesh.layers.enable( CAMERA_LAYERS.DYNAMIC )

            this.mesh.castShadow = true;

            this.mesh.receiveShadow = true;

            parent.add(this.mesh);
        }

        const wrapper = this.mesh.add(data);

        wrapper.buildCollisionMesh = this.buildCollisionMesh;

        return wrapper;
    }

    onCollision( collision ){
    }

    buildCollisionMesh = () => {
        if (this._material == null) {
            this._material = new MeshBasicMaterial({
                color: 0xff0000,
                wireframe: true,
            });
        }

        const mesh = new Mesh(this.geometry, this._material);

        mesh.visible = true;

        mesh.updateMatrixWorld();

        this._collisionMesh = mesh;

        return mesh;
    };

    disposeAll() {

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
