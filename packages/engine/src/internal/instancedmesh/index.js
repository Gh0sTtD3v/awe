import InstancedBasic from "../rendering/materials/instancedbasic";

import InstancedStandard from "../rendering/materials/instancedstandard";

import { createInstancedMesh } from "../pipeline/lod-instanced-pipeline-mesh";

import InstancedShadow from "../rendering/materials/instancedshadow";

import { CAMERA_LAYERS } from "../constants";
import { pipe } from "gsap";

var id = 0;

export class InstancedMeshFactory {
    constructor(data = {}) {
        this.isInit = false;

        this._init = false;

        this._instances = {};
    }

    async preload() {}

    get(parent, op = {}) {

        var defaultOptions = {

            material: null,

            useGeometryColor: false,

            useNormal: true,

            scale: true,

            opacity: true,

            rotation: true,

            rotationY: false,

            boundingSphere: null,

            name: "custom_instanced_geometry",

            plugins: null,

            chunks: null,

            enableRealTimeShadow: false,

            useFrustumCulling: true,

            useSorting: true,

            atlas: false,

            randomID: false,
        };

        var data = Object.assign(defaultOptions, op);

        const baseMesh = data.baseMesh;

        const baseGeometry = baseMesh.geometry.clone();

        if (baseMesh.geometry.lod) {
            baseGeometry.lod = baseMesh.geometry.lod.map((lod) => lod.clone());
        }

        baseGeometry.computeBoundingSphere();

        const opts = {};

        if (data.plugins) {
            opts.plugins = data.plugins;
        }

        if (data.chunks) {
            opts.chunks = data.chunks;
        }

        let diffuseMaterial, lightingMaterial;

        if ( data.material ) {

            if(data.material.diffuseMaterial ){
                diffuseMaterial = data.material.diffuseMaterial;
                diffuseMaterial.side = 2;
            }
            else {

                diffuseMaterial = data.material;
            }

            if( data.material.lightingMaterial ){

                lightingMaterial = data.material.lightingMaterial;
                lightingMaterial.side = 2;
                lightingMaterial.envMapIntensity = 0;
            }
            else {

                lightingMaterial = data.material;
            }

        } else {

            diffuseMaterial = new InstancedBasic(opts);

            diffuseMaterial.copy(baseMesh.material);

            diffuseMaterial.side = 2;

            lightingMaterial = new InstancedStandard(opts);

            lightingMaterial.copy(baseMesh.material);

            lightingMaterial.side = 2;

            lightingMaterial.envMapIntensity = 0;
        }


        let instancedGeometryOptions = {
            useGeometryColor: data.useGeometryColor,

            scale: data.scale,

            opacity: data.opacity,

            useNormal: data.useNormal,

            rotation: data.rotation,

            rotationY: data.rotationY,

            boundingSphere: baseGeometry.boundingSphere,

            name: "custom_instanced_geometry" + id,

            plugins: data.plugins,

            chunks: data.chunks,

            useFrustumCulling: data.useFrustumCulling,

            useSorting: data.useSorting,

            atlas: data.atlas,

            randomID: data.randomID,
        };

        instancedGeometryOptions = Object.assign(
            instancedGeometryOptions,
            data.instancedGeometryOptions
        );


        let pipelineOptions = {

            lightingMaterial: lightingMaterial,

            occlusionMaterial: diffuseMaterial,

            lightingOcclusionMaterial: lightingMaterial,

            visibleOnOcclusion: true,

            type: "custom_instanced_mesh" + id,
        }

        if( data.material?.occlusionMaterial ){

            pipelineOptions.occlusionMaterial = data.material.occlusionMaterial;
        }

        if( data.material?.lightingOcclusionMaterial ){

            pipelineOptions.lightingOcclusionMaterial = data.material.lightingOcclusionMaterial;
        }

        const mesh = createInstancedMesh(
            baseGeometry,
            diffuseMaterial,
            instancedGeometryOptions,
            pipelineOptions
        );

        id++;

        if (data.enableRealTimeShadow == true) {

            mesh.layers.disableAll();

            mesh.layers.enable(CAMERA_LAYERS.DYNAMIC);
        }

        const opts2 = {
            defines: {
                SHADOW: "",
                DEBUG: "",
            },
        };

        if (data.plugins) {
            opts2.plugins = data.plugins;
            opts2.chunks = data.chunks;
        }

        mesh.frustumCulled = false;

        mesh.customDepthMaterial = new InstancedShadow(opts2);

        mesh.castShadow = true;

        mesh.receiveShadow = true;

        if (parent) {
            parent.add(mesh);
        }

        return mesh;
    }

    wrapperUpdate(wrapper) {
        this.mesh.wrapperUpdate(wrapper);
    }

    onCollision(collision) {
        //
        // player.applyImpulse( collision.normal , 10 )
    }

    // disposeAll() {

    //     if (this.mesh) {

    //         if (this.mesh.parent) {
    //             this.mesh.parent.remove(this.mesh);
    //         }

    //         this.mesh?.geometry?.dispose()

    //         this.mesh?.dispose();

    //         this.mesh = null;
    //     }
    // }
}
